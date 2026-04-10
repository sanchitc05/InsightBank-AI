"""Unit tests for the SBI parser — Layout A (table) and Layout B (text/OCR)."""
import pytest
from app.parsers.sbi_parser import SBIParser


@pytest.fixture
def parser():
    return SBIParser()


# ────────────────────────────────────────────────────────────
# parse_text — Layout B
# ────────────────────────────────────────────────────────────

class TestSBIParseText:
    """Tests for the regex-based text parser (Layout B)."""

    def test_single_debit_with_bare_zero_credit(self, parser):
        """SBI OCR format: DATE DESC - CREDIT DEBIT BALANCE with bare 0 for credit."""
        text = "09-02-26 ATM CASH 604008004880 BANK - 0 6000.00 2000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "09-02-26"
        assert "ATM CASH" in rows[0]["description"]
        assert rows[0]["debit"] == "6000.00"
        assert rows[0]["credit"] is None  # bare 0 normalised to None
        assert rows[0]["balance"] == "2000.00"

    def test_single_credit_with_bare_zero_debit(self, parser):
        """SBI OCR format: credit amount with bare 0 for debit."""
        text = "08-02-26 UPI/CR/603942088128/SANCHIT/IOBA/sanchitcha/Assign - 6000.00 0 8000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["credit"] == "6000.00"
        assert rows[0]["debit"] is None  # bare 0 normalised
        assert rows[0]["balance"] == "8000.00"

    def test_credit_detection_via_upi_cr(self, parser):
        """UPI/CR lines should yield credit, not debit."""
        text = "13-02-26 UPI/CR/604445671286/SANCHIT/IOBA/sanchitcha/UPI - 300.00 0 2319.03"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["credit"] == "300.00"
        assert rows[0]["debit"] is None

    def test_debit_detection_via_upi_dr(self, parser):
        """UPI/DR lines should yield debit, not credit."""
        text = "12-02-26 UPI/DR/604306980899/DEEPAK/KKBK/9079803970/UPI - 0 180.00 1820.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["debit"] == "180.00"
        assert rows[0]["credit"] is None

    def test_both_amounts_present(self, parser):
        text = "10 Mar 2026 TRANSFER TO SAVINGS 1,000.00 2,000.00 23,500.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["credit"] == "1,000.00"  # first amount = credit
        assert rows[0]["debit"] == "2,000.00"   # second amount = debit
        assert rows[0]["balance"] == "23,500.00"

    def test_date_format_slash(self, parser):
        text = "15/03/2026 ATM WITHDRAWAL 0 2,000.00 22,000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "15/03/2026"

    def test_date_format_dash(self, parser):
        text = "20-04-2026 POS/AMAZON 0 1,299.00 20,701.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "20-04-2026"

    def test_date_format_long(self, parser):
        text = "01 Jan 2026 UPI/DR/407123456/ZOMATO 0 500.00 24,500.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "01 Jan 2026"

    def test_multiline_description(self, parser):
        text = (
            "01 Jan 2026 UPI/DR/407123456789/\n"
            "ZOMATO/Payment for order 0 500.00 24,500.00"
        )
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert "ZOMATO" in rows[0]["description"]
        assert "Payment for order" in rows[0]["description"]

    def test_multiple_transactions(self, parser):
        text = (
            "01-02-26 UPI/DR/SWIGGY - 0 350.00 24,650.00\n"
            "02-02-26 NEFT/CR/SALARY - 50,000.00 0 74,650.00\n"
            "03-02-26 ATM WITHDRAWAL - 0 5,000.00 69,650.00\n"
        )
        rows = parser.parse_text(text)
        assert len(rows) == 3

    def test_skips_header_lines(self, parser):
        text = (
            "STATE BANK OF INDIA\n"
            "Account Statement\n"
            "01-02-26 UPI/DR/PAYMENT - 0 200.00 24,800.00\n"
        )
        rows = parser.parse_text(text)
        assert len(rows) == 1

    def test_empty_text_returns_empty(self, parser):
        assert parser.parse_text("") == []
        assert parser.parse_text("   \n\n  ") == []

    def test_description_cleaned_of_trailing_separator(self, parser):
        """Trailing '- 0' from OCR should be stripped from description."""
        text = "12-02-26 ATM CASH 604315016349 INDUSIND BANK LIMITED LUDHI . 0 5000.00 2000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert not rows[0]["description"].endswith(".")
        assert not rows[0]["description"].endswith("0")

    def test_leading_underscore_cleaned(self, parser):
        """OCR sometimes produces leading underscores at page boundaries."""
        text = "27-02-26 _UPI/CR/605821185158/SANCHIT/IOBA/sanchitcha/UPI - 200.00 0 2081.03"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["description"].startswith("UPI/CR")

    def test_skips_zero_amount_lines(self, parser):
        """Lines where both credit and debit resolve to 0 should be skipped."""
        text = "01-01-26 SOME DESCRIPTION 0 0 5000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 0

    def test_real_ocr_output(self, parser):
        """Integration test with a batch of real OCR lines from an SBI statement."""
        text = (
            "08-02-26 UPI/CR/603942088128/SANCHIT/IOBA/sanchitcha/Assign - 6000.00 0 8000.00\n"
            "09-02-26 ATM CASH 604008004880 PUNJAB SIND BANK — LUDHI - 0 6000.00 2000.00\n"
            "12-02-26 UPI/CR/640944250098/SANCHIT/IOBA/sanchitcha/UPI - 5000.00 0 7000.00\n"
            "12-02-26 ATM CASH 604315016349 INDUSIND BANK LIMITED LUDHI . 0 5000.00 2000.00\n"
            "12-02-26 UPI/DR/604306980899/DEEPAK /KKBK/9079803970/UPI - 0 180.00 1820.00\n"
        )
        rows = parser.parse_text(text)
        assert len(rows) == 5
        # First is credit
        assert rows[0]["credit"] == "6000.00"
        assert rows[0]["debit"] is None
        # Second is debit
        assert rows[1]["debit"] == "6000.00"
        assert rows[1]["credit"] is None


# ────────────────────────────────────────────────────────────
# parse_table — Layout A (smoke test)
# ────────────────────────────────────────────────────────────

class TestSBIParseTable:
    """Basic tests for the table-based parser (Layout A)."""

    def test_valid_table_row(self, parser):
        table = [
            ["Txn Date", "Description", "Ref No", "Debit", "Credit", "Balance"],
            ["01/01/2026", "UPI PAYMENT", "REF123", "500.00", None, "24500.00"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 1
        assert rows[0]["date"] == "01/01/2026"
        assert rows[0]["debit"] == "500.00"

    def test_skips_short_rows(self, parser):
        table = [
            ["01/01/2026", "UPI"],  # too short
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 0

    def test_skips_header_row(self, parser):
        table = [
            ["Date", "Narration", "Ref", "Debit", "Credit", "Balance"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 0
