import math
import re
import sys
import io
import logging
from abc import ABC, abstractmethod
from datetime import datetime, date
from typing import List, Optional

import pandas as pd

# Fix UTF-8 encoding on Windows for ₹ symbol support
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# Setup logger
logger = logging.getLogger(__name__)


class ParserError(Exception):
    """Custom exception for bank statement parsing errors."""
    pass


class BaseParser(ABC):
    """Abstract base class for all bank statement parsers (PDF and CSV)."""

    @abstractmethod
    def parse(self, file_path: str, **kwargs) -> pd.DataFrame:
        """
        Parse the statement file and return a structured DataFrame.
        This method is synchronous and CPU-bound. Offload to thread-pools in async contexts.
        """
        pass

    def extract_account_number(self, file_path: str, ocr_text: Optional[str] = None) -> Optional[str]:
        """
        Generic regex-based account number extraction from file.
        """
        text = ""
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                # Only check first two pages for account info
                for page in pdf.pages[:2]:
                    text += (page.extract_text() or "") + "\n"
        except Exception:
            pass
        
        if ocr_text:
            text += ocr_text[:2000]
            
        return self.extract_account_number_from_text(text)

    @staticmethod
    def extract_account_number_from_text(text: str) -> Optional[str]:
        """Extract account number from raw text using regex."""
        # Common patterns for Indian banks
        patterns = [
            r"Account\s*No\.?\s*:\s*(\d{8,16})",
            r"Account\s*Number\s*:\s*(\d{8,16})",
            r"A/c\s*No\.?\s*:\s*(\d{8,16})",
            r"Cust\s*ID/Acc\s*No\s*:\s*(\d{8,16})",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _cleanup_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standard polish for extracted transaction dataframes."""
        if df.empty:
            return df
            
        # Clean up columns if they exist
        if "date" in df.columns:
            df["date"] = df["date"].apply(self._safe_parse_date)
            df = df.dropna(subset=["date"])
            
        for col in ["debit", "credit", "balance"]:
            if col in df.columns:
                df[col] = df[col].apply(self.clean_amount)
                df[col] = df[col].fillna(0.0)

        return df

    def _parse_pdf_structured(self, pdf_path: str, ocr_text: Optional[str] = None) -> List[dict]:
        """ Helper for PDF subclasses: Standard page extraction loop. """
        all_rows = []
        self.metadata = {"account_number": None, "period": None}
        full_text = ""
        
        try:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    full_text += page_text + "\n"
                    
                    # Try tables
                    tables = page.extract_tables()
                    rows_before = len(all_rows)
                    if tables:
                        for table in tables:
                            all_rows.extend(self.parse_table(table))
                    
                    # Fallback to text if tables found nothing
                    if len(all_rows) == rows_before:
                        if page_text:
                            all_rows.extend(self.parse_text(page_text))
            
            # OCR Fallback
            if len(all_rows) < 5 and ocr_text and ocr_text.strip():
                full_text += ocr_text
                rows = self.parse_text(ocr_text)
                if rows:
                    all_rows = rows
                    logger.info(f"[OCR FALLBACK] Extracted {len(rows)} row(s) from OCR text")
            
            # Extract metadata from accumulated text
            self.metadata["account_number"] = self.extract_account_number_from_text(full_text)
            self.metadata["period"] = self.extract_period(full_text)
                    
        except Exception as e:
            logger.error(f"Error during PDF extraction: {str(e)}", exc_info=True)
            raise ParserError(f"PDF extraction failed: {str(e)}")
            
        return all_rows

    @abstractmethod
    def parse_table(self, table: list) -> List[dict]:
        """Parse a single extracted table. Must be implemented by subclasses."""
        pass

    def parse_text(self, text: str) -> List[dict]:
        """Parse raw text from a page. Override in subclass if needed."""
        return []

    @staticmethod
    def clean_amount(val) -> float:
        """Strip commas, currency symbols, whitespace; return float."""
        if val is None or val == "" or val == "None":
            return 0.0
        if isinstance(val, (int, float)):
            if math.isnan(float(val)):
                return 0.0
            return float(val)
        val = str(val).strip()
        val = val.replace(",", "").replace("₹", "").replace("INR", "")
        val = val.replace(" ", "").replace("\n", "")
        # Remove Dr/Cr suffixes
        val = re.sub(r'\s*(Dr|Cr|DR|CR)\.?\s*$', '', val)
        try:
            return abs(float(val))
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def extract_period(text: str) -> Optional[dict]:
        """
        Attempts to extract statement period (month/year) from text.
        Returns {'month': int, 'year': int} or None.
        """
        # Look for "Period: 01-Jan-2026 to 31-Jan-2026" or similar
        # Or "Statement for: January 2026"
        month_names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        months_full = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
        
        # Pattern 1: Month Name Year (e.g. January 2026)
        for i, m in enumerate(months_full):
            pattern = re.compile(rf"{m}\s*,?\s*(20\d{{2}})", re.IGNORECASE)
            match = pattern.search(text)
            if match:
                return {"month": i + 1, "year": int(match.group(1))}
        
        # Pattern 2: DD-MMM-YYYY (e.g. 01-Jan-2026)
        pattern = re.compile(r"(\d{2})[-/]([a-zA-Z]{3})[-/](20\d{2})")
        match = pattern.search(text)
        if match:
            mon_str = match.group(2).lower()
            if mon_str in month_names:
                return {"month": month_names.index(mon_str) + 1, "year": int(match.group(3))}
                
        return None

    @staticmethod
    def parse_date_static(val) -> Optional[date]:
        """Try multiple date formats and return a date object."""
        if val is None:
            return None
        if isinstance(val, date):
            return val
        if isinstance(val, datetime):
            return val.date()

        val = str(val).strip()
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
            "%d %b %Y", "%d %b %y", "%d-%b-%Y", "%d-%b-%y",
            "%d %B %Y", "%d %B %y",
            "%Y-%m-%d", "%m/%d/%Y",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
        return None

    def _safe_parse_date(self, val):
        """Wrapper for parse_date that returns None on failure."""
        return self.parse_date_static(val)
