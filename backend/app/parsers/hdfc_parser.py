import re
from typing import List

from app.parsers.base_parser import BaseParser


class HDFCParser(BaseParser):
    """Parser for HDFC Bank statements."""

    def parse_table(self, table: list) -> List[dict]:
        """
        HDFC tables: Date | Narration | Chq/Ref No | Value Dt | Withdrawal Amt | Deposit Amt | Closing Balance
        """
        rows = []
        for row in table:
            if not row or len(row) < 5:
                continue

            first_cell = str(row[0] or "").strip().lower()
            if first_cell in ("", "date", "transaction date", "value date"):
                continue
            if "date" in first_cell or "narration" in first_cell:
                continue

            # Check if first cell looks like a date
            if not re.match(r'\d{1,2}[/-]', first_cell):
                continue

            try:
                # HDFC has varying column counts
                if len(row) >= 7:
                    txn = {
                        "date": str(row[0] or "").strip(),
                        "description": str(row[1] or "").strip(),
                        "debit": row[4],    # Withdrawal
                        "credit": row[5],   # Deposit
                        "balance": row[6],  # Closing Balance
                    }
                elif len(row) >= 5:
                    txn = {
                        "date": str(row[0] or "").strip(),
                        "description": str(row[1] or "").strip(),
                        "debit": row[3] if len(row) > 3 else None,
                        "credit": row[4] if len(row) > 4 else None,
                        "balance": row[5] if len(row) > 5 else None,
                    }
                else:
                    continue

                if txn["description"]:
                    rows.append(txn)
            except (IndexError, TypeError):
                continue

        return rows

    def parse_text(self, text: str) -> List[dict]:
        """Fallback: parse HDFC text line by line using regex."""
        rows = []
        lines = text.split("\n")
        pattern = re.compile(
            r'(\d{2}/\d{2}/\d{2,4})\s+(.+?)\s+'
            r'([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})'
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
