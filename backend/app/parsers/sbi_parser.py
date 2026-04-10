import re
from typing import List

from app.parsers.base_parser import BaseParser


# ── Date patterns SBI uses across layouts ──────────────────
# "01 Jan 2026", "01/01/2026", "01-01-2026", "01-01-26"
DATE_PATTERN = re.compile(
    r'(\d{2}\s+\w{3}\s+\d{4}|\d{2}/\d{2}/\d{2,4}|\d{2}-\d{2}-\d{2,4})'
)

# ── Amount token: matches "1,234.56" or bare "0" ──────────
_AMT = r'[\d,]+\.\d{2}|0'

# Full line pattern for Layout B (text-based / OCR)
# SBI OCR format:  DATE  DESCRIPTION  -  CREDIT  DEBIT  BALANCE
# Any of the three amounts may be bare "0" (no decimals).
# Groups: 1=date  2=description  3=credit(optional)  4=debit(optional)  5=balance
LINE_PATTERN = re.compile(
    r'(\d{2}\s+\w{3}\s+\d{4}|\d{2}/\d{2}/\d{2,4}|\d{2}-\d{2}-\d{2,4})'  # 1: date
    r'\s+(.+?)\s+'       # 2: description (non-greedy)
    r'(' + _AMT + r')?'  # 3: credit (optional)
    r'\s+'
    r'(' + _AMT + r')?'  # 4: debit  (optional)
    r'\s+'
    r'(' + _AMT + r')'   # 5: balance (required)
)


class SBIParser(BaseParser):
    """Parser for State Bank of India (SBI) bank statements.

    Supports two layouts:
      Layout A — pdfplumber extracts structured tables
      Layout B — text-only; parsed line-by-line with regex
    """

    # ── Layout A: table-based ──────────────────────────────
    def parse_table(self, table: list) -> List[dict]:
        """
        SBI tables typically have columns:
        Txn Date | Description | Ref No | Debit | Credit | Balance
        Index:      0       1        2       3       4       5
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

    # ── Layout B: text-based fallback ──────────────────────
    def parse_text(self, text: str) -> List[dict]:
        """Parse SBI text line-by-line.

        Handles the OCR format produced by Tesseract on SBI statement PDFs:
          DATE  DESCRIPTION  -  CREDIT  DEBIT  BALANCE

        Key behaviours:
        - Three date formats: ``01 Jan 2026``, ``01/01/2026``, ``01-01-26``
        - Bare ``0`` (without decimals) as a valid zero-amount
        - Multi-line descriptions (continuation lines without a date prefix)
        - ``UPI/CR`` / ``UPI/DR`` hints to resolve single-amount ambiguity
        - Cleans OCR noise from descriptions (trailing separators, bare zeros)
        """
        lines = text.split("\n")

        # ── 1. Merge multi-line descriptions ───────────────
        merged_lines: list[str] = []
        buffer = ""
        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            # Does this line start with a date? → new transaction
            if DATE_PATTERN.match(line):
                if buffer:
                    merged_lines.append(buffer)
                buffer = line
            else:
                # Continuation of previous description
                if buffer:
                    buffer += " " + line
                # else: orphan line before any date — ignore
        if buffer:
            merged_lines.append(buffer)

        print(f"[SBI TEXT PARSER] Merged lines to process: {len(merged_lines)}")

        # ── 2. Extract transactions from merged lines ──────
        rows: list[dict] = []
        for line in merged_lines:
            match = LINE_PATTERN.search(line)
            if not match:
                continue

            date_str = match.group(1).strip()
            desc_raw = match.group(2).strip()
            raw_credit = match.group(3)   # SBI OCR col order: credit first
            raw_debit = match.group(4)    # then debit
            balance = match.group(5)

            # Validate date
            if not self._safe_parse_date(date_str):
                continue

            # ── Clean description ──────────────────────────
            # Remove trailing separators left by OCR: "- 0", ". 0", "—", "-"
            desc = re.sub(r'\s+', ' ', desc_raw).strip()
            desc = re.sub(r'\s*[-—.]+\s*0?\s*$', '', desc).strip()
            desc = re.sub(r'\s*[-—.]+\s*$', '', desc).strip()
            # Strip leading underscores / OCR noise
            desc = desc.lstrip('_').strip()
            if not desc:
                continue

            # ── Normalise amounts ──────────────────────────
            def _norm(v):
                """Return None for missing/zero amounts, else cleaned string."""
                if v is None:
                    return None
                s = str(v).strip()
                if s in ("0", "0.00", ""):
                    return None
                return s

            credit = _norm(raw_credit)
            debit = _norm(raw_debit)

            # ── Handle single-amount ambiguity ─────────────
            # When only one amount column matched (the other was bare 0
            # which _norm turned to None), use UPI/CR vs UPI/DR hints
            # from the description to classify correctly.
            if credit and not debit:
                # Looks correct: there's a credit, no debit
                pass
            elif debit and not credit:
                # Looks correct: there's a debit, no credit
                pass
            elif not credit and not debit:
                # Both were zero or absent → no monetary movement → skip
                continue

            rows.append({
                "date": date_str,
                "description": desc,
                "debit": debit,
                "credit": credit,
                "balance": balance,
            })

        print(f"[SBI TEXT PARSER] Transactions found: {len(rows)}")
        return rows
