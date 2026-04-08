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
        """Fallback: parse SBI text line by line using regex extraction."""
        rows = []
        lines = text.split("\n")
        
        # Regex pattern: DATE DESCRIPTION - CREDIT DEBIT BALANCE
        # Handles optional credit/debit 0 values
        pattern = re.compile(
            r'^(\d{1,2}[/-](?:[a-zA-Z]{3}|\d{1,2})[/-]\d{2,4})\s+' # Date
            r'(.*?)\s+'                                           # Description
            r'(?:-\s+)?'                                          # Optional hyphen
            r'([\d,]+\.?\d*|0\.00|0)?\s*'                         # Credit
            r'([\d,]+\.?\d*|0\.00|0)?\s*'                         # Debit
            r'([\d,]+\.?\d*|0\.00|0)$'                            # Balance
        )

        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            match = pattern.search(line)
            if match:
                date_str = match.group(1)
                desc = match.group(2)
                credit = match.group(3)
                debit = match.group(4)
                balance = match.group(5)

                # Clean description (remove underscores and extra spaces)
                desc = desc.replace("_", " ")
                desc = re.sub(r'\s+', ' ', desc).strip()
                if desc.endswith('-'):
                    desc = desc[:-1].strip()

                # Normalize values (handle 0 values correctly)
                def norm(v):
                    if not v or str(v).strip() in ("0", "0.00"):
                        return None
                    return str(v).strip()

                rows.append({
                    "date": date_str,
                    "description": desc,
                    "credit": norm(credit),
                    "debit": norm(debit),
                    "balance": norm(balance),
                })
        return rows
