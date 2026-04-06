import pdfplumber
import os
from typing import Union, Type

from app.parsers.sbi_parser import SBIParser
from app.parsers.hdfc_parser import HDFCParser
from app.parsers.icici_parser import ICICIParser
from app.parsers.csv_parser import CSVParser
from app.parsers.ocr_extractor import OCRExtractor


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
    # Check for CSV first
    if file_path.lower().endswith('.csv'):
        return "CSV"

    try:
        # Check if PDF is scanned and needs OCR
        ocr = OCRExtractor()
        if ocr.is_likely_scanned(file_path):
            text = await ocr.extract_from_pdf(file_path)
        else:
            async with anyio.open_file(file_path, "rb") as f:
                # We still use pdfplumber for text extraction but we wrap it
                # or just use it synchronously if it's fast enough.
                # However, the OCR calls are the main bottleneck.
                with pdfplumber.open(file_path) as pdf:
                    if not pdf.pages:
                        return "GENERIC"
                    text = pdf.pages[0].extract_text() or ""
        
        text_upper = text.upper()
        for keyword, bank_code in BANK_KEYWORDS.items():
            if keyword.upper() in text_upper:
                return bank_code

    except Exception as e:
        logger.error(f"Error during bank detection: {str(e)}")
        pass

    return "GENERIC"


async def get_parser(bank: str):
    """Return the appropriate parser instance (async ready)."""
    parser_class = PARSER_MAP.get(bank, HDFCParser)
    return parser_class()
