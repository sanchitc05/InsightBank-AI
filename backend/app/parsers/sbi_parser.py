import re
from typing import List

from app.parsers.base_parser import BaseParser


class SBIParser(BaseParser):
    """Parser for State Bank of India (SBI) bank statements."""

    def parse_table(self, table: list) -> List[dict]:
        """
        SBI tables typically have columns:
        Txn Date | Description | Ref No | Debit | Credit | Balance
        """
        rows = []
        for row in table:
            if not row or len(row) < 5:
                continue

            # Skip header rows
            first_cell = str(row[0] or "").strip().lower()
            if first_cell in ("", "date", "txn date", "transaction date", "value date"):
                continue
            if "date" in first_cell:
                continue

            # Check if first cell looks like a date
            if not re.match(r'\d{1,2}[/-]', first_cell):
                continue

            try:
                txn = {
                    "date": str(row[0] or "").strip(),
                    "description": str(row[1] or "").strip(),
                    "debit": row[3] if len(row) > 3 else None,
                    "credit": row[4] if len(row) > 4 else None,
                    "balance": row[5] if len(row) > 5 else None,
                }
                # Skip if description is empty
                if txn["description"]:
                    rows.append(txn)
            except (IndexError, TypeError):
                continue

        return rows

    def parse_text(self, text: str) -> List[dict]:
        """Fallback: parse SBI text line by line."""
        rows = []
        lines = text.split("\n")
        pattern = re.compile(
            r'(\d{2}[/-]\d{2}[/-]\d{2,4})\s+(.+?)\s+'
            r'([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?'
        )
        for line in lines:
            match = pattern.search(line)
            if match:
                rows.append({
                    "date": match.group(1),
                    "description": match.group(2).strip(),
                    "debit": match.group(3),
                    "credit": match.group(4),
                    "balance": match.group(5),
                })
        return rows
