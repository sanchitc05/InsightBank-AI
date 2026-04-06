import re
from typing import List

from app.parsers.base_parser import BaseParser


class ICICIParser(BaseParser):
    """Parser for ICICI Bank statements."""

    def parse_table(self, table: list) -> List[dict]:
        """
        ICICI tables: Date | Transaction Remarks | Amount (INR) | Type (Dr/Cr) | Balance (INR)
        or: Date | Particulars | Withdrawal | Deposit | Balance
        """
        rows = []
        for row in table:
            if not row or len(row) < 4:
                continue

            first_cell = str(row[0] or "").strip().lower()
            if first_cell in ("", "date", "transaction date", "value date", "s.no"):
                continue
            if "date" in first_cell or "particulars" in first_cell:
                continue

            if not re.match(r'\d{1,2}[/-]', first_cell):
                continue

            try:
                # Format 1: Date | Remarks | Amount | Type(Dr/Cr) | Balance
                if len(row) >= 5:
                    type_cell = str(row[3] or "").strip().upper()

                    if type_cell in ("DR", "CR", "DR.", "CR."):
                        amount = self.clean_amount(row[2])
                        txn = {
                            "date": str(row[0] or "").strip(),
                            "description": str(row[1] or "").strip(),
                            "debit": amount if "DR" in type_cell else 0,
                            "credit": amount if "CR" in type_cell else 0,
                            "balance": row[4],
                        }
                    else:
                        # Format 2: Date | Particulars | Withdrawal | Deposit | Balance
                        txn = {
                            "date": str(row[0] or "").strip(),
                            "description": str(row[1] or "").strip(),
                            "debit": row[2],
                            "credit": row[3],
                            "balance": row[4],
                        }

                    if txn["description"]:
                        rows.append(txn)
            except (IndexError, TypeError):
                continue

        return rows

    def parse_text(self, text: str) -> List[dict]:
        """Fallback: parse ICICI text."""
        rows = []
        lines = text.split("\n")
        pattern = re.compile(
            r'(\d{2}[/-]\d{2}[/-]\d{2,4})\s+(.+?)\s+'
            r'([\d,]+\.\d{2})\s+(Dr|Cr|DR|CR)\.?\s*([\d,]+\.\d{2})?'
        )
        for line in lines:
            match = pattern.search(line)
            if match:
                amount = self.clean_amount(match.group(3))
                is_debit = "DR" in match.group(4).upper()
                rows.append({
                    "date": match.group(1),
                    "description": match.group(2).strip(),
                    "debit": amount if is_debit else 0,
                    "credit": amount if not is_debit else 0,
                    "balance": match.group(5),
                })
        return rows
