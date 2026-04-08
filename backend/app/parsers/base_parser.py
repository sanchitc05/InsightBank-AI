import re
import sys
import io
from abc import ABC, abstractmethod
from datetime import datetime, date
from typing import List, Optional

import pandas as pd

# Fix UTF-8 encoding on Windows for ₹ symbol support
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class BaseParser(ABC):
    """Abstract base class for bank statement PDF parsers."""

    async def parse(self, pdf_path: str) -> pd.DataFrame:
        """Open PDF and extract transactions from all pages (Async)."""
        import asyncio
        loop = asyncio.get_event_loop()
        
        def _sync_parse():
            all_rows = []
            try:
                import pdfplumber
            except Exception:
                # pdfplumber not available in the environment; return empty
                return all_rows

            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            rows = self.parse_table(table)
                            all_rows.extend(rows)

                    # If no tables found, try text extraction
                    if not tables:
                        text = page.extract_text()
                        if text:
                            rows = self.parse_text(text)
                            all_rows.extend(rows)
            return all_rows

        # Run the heavy parsing in a thread
        all_rows = await loop.run_in_executor(None, _sync_parse)

        if not all_rows:
            return pd.DataFrame()

        df = pd.DataFrame(all_rows)
        # Clean up the dataframe
        if "date" in df.columns:
            df["date"] = df["date"].apply(self._safe_parse_date)
            df = df.dropna(subset=["date"])
        if "debit" in df.columns:
            df["debit"] = df["debit"].apply(self.clean_amount)
        if "credit" in df.columns:
            df["credit"] = df["credit"].apply(self.clean_amount)
        if "balance" in df.columns:
            df["balance"] = df["balance"].apply(self.clean_amount)

        return df

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
