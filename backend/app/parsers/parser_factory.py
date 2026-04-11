import os
import logging
import anyio
from typing import Union, Type

from app.parsers.sbi_parser import SBIParser
from app.parsers.hdfc_parser import HDFCParser
from app.parsers.icici_parser import ICICIParser
from app.parsers.csv_parser import CSVParser
from app.parsers.ocr_extractor import OCRExtractor
from app.parsers.base_parser import ParserError

# Setup logger
logger = logging.getLogger(__name__)


BANK_KEYWORDS = {
    "STATE BANK OF INDIA": "SBI",
    "STATE BANK": "SBI",
    "SBI": "SBI",
    "HDFC BANK": "HDFC",
    "HDFC": "HDFC",
    "ICICI BANK": "ICICI",
    "ICICI": "ICICI",
    "AXIS BANK": "AXIS",
    "KOTAK": "KOTAK",
}

PARSER_MAP = {
    "SBI": SBIParser,
    "HDFC": HDFCParser,
    "ICICI": ICICIParser,
    "AXIS": HDFCParser,      # Similar format
    "KOTAK": HDFCParser,     # Similar format
    "CSV": CSVParser,        # Added CSV support
    "GENERIC": HDFCParser,   # Fallback
}


async def detect_bank(file_path: str) -> str:
    """Detect the bank from the file content (PDF or CSV) - Async version."""
    # Check for CSV first by extension
    if file_path.lower().endswith('.csv'):
        logger.debug("detect_bank: CSV file detected by extension")
        return "CSV"

    try:
        # First try cheap text extraction from the first few pages
        try:
            import pdfplumber
        except Exception:
            pdfplumber = None

        total_text = ""
        if pdfplumber:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages[:3]:
                    total_text += (page.extract_text() or "")

            if total_text and len(total_text.strip()) >= 100:
                text_upper = total_text.upper()
                for keyword, bank_code in BANK_KEYWORDS.items():
                    if keyword in text_upper:
                        logger.debug(f"detect_bank: matched {bank_code} via quick pdf text")
                        return bank_code

        # If not enough extractable text, attempt OCR only when an engine is likely available
        logger.debug("detect_bank: insufficient quick text; attempting OCR if available")
        tesseract_path = OCRExtractor.find_tesseract()
        ocr = None
        if os.name == 'nt' or tesseract_path:
            ocr = OCRExtractor(tesseract_path=tesseract_path)

        if ocr:
            text = await ocr.extract_from_pdf(file_path)
            text_upper = (text or "").upper()
            for keyword, bank_code in BANK_KEYWORDS.items():
                if keyword in text_upper:
                    logger.debug(f"detect_bank: matched {bank_code} via OCR text")
                    return bank_code

    except Exception as e:
        logger.error(f"Error during bank detection: {str(e)}", exc_info=True)
        raise ParserError(f"Bank detection failed: {str(e)}")

    return "GENERIC"


async def get_parser(bank: str):
    """Return the appropriate parser instance (async ready)."""
    parser_class = PARSER_MAP.get(bank, HDFCParser)
    return parser_class()
