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


def detect_bank(file_path: str) -> str:
    """Detect the bank from the file content (PDF or CSV) - Synchronous version."""
    # Check for CSV first by extension
    if file_path.lower().endswith('.csv'):
        logger.debug("detect_bank: CSV file detected by extension")
        return "CSV"

    try:
        # 1. Quick PDF Text Extraction
        try:
            import pdfplumber
        except ImportError:
            logger.warning("pdfplumber not found, skipping quick extraction")
            pdfplumber = None

        total_text = ""
        if pdfplumber:
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages[:3]:
                        total_text += (page.extract_text() or "")
            except Exception as e:
                logger.warning(f"pdfplumber failed to read {file_path}: {e}")

        if total_text and len(total_text.strip()) >= 50:
            text_upper = total_text.upper()
            for keyword, bank_code in BANK_KEYWORDS.items():
                if keyword in text_upper:
                    logger.debug(f"detect_bank: matched {bank_code} via quick pdf text")
                    return bank_code

        # 2. OCR Fallback if quick text failed or not enough text
        logger.debug("detect_bank: insufficient text; attempting OCR")
        tesseract_path = OCRExtractor.find_tesseract()
        
        # On Windows or if tesseract found, try OCR
        if os.name == 'nt' or tesseract_path:
            try:
                ocr = OCRExtractor(tesseract_path=tesseract_path)
                ocr_text = ocr.extract_from_pdf(file_path)
                if ocr_text:
                    text_upper = ocr_text.upper()
                    for keyword, bank_code in BANK_KEYWORDS.items():
                        if keyword in text_upper:
                            logger.debug(f"detect_bank: matched {bank_code} via OCR text")
                            return bank_code
            except Exception as e:
                logger.warning(f"OCR detection failed: {e}")

    except Exception as e:
        logger.error(f"Critical error during bank detection: {str(e)}", exc_info=True)
        # We don't want to crash the whole upload process if detection fails
        return "GENERIC"

    return "GENERIC"


def get_parser(bank: str):
    """Return the appropriate parser instance (synchronous)."""
    parser_class = PARSER_MAP.get(bank, HDFCParser)
    return parser_class()
