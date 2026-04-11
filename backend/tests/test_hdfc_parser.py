import pytest
from app.parsers.hdfc_parser import HDFCParser

@pytest.fixture
def parser():
    return HDFCParser()

class TestHDFCParseTable:
    def test_valid_table_row_format_1(self, parser):
        # Date | Narration | Chq/Ref No | Value Dt | Withdrawal Amt | Deposit Amt | Closing Balance
        table = [
            ["Date", "Narration", "Chq/Ref No", "Value Dt", "Withdrawal Amt", "Deposit Amt", "Closing Balance"],
            ["01/01/2026", "ZOMATO ORDER", "REF123", "01/01/2026", "500.00", "0.00", "10000.00"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 1
        assert rows[0]["date"] == "01/01/2026"
        assert rows[0]["description"] == "ZOMATO ORDER"
        assert rows[0]["debit"] == "500.00"
        assert rows[0]["credit"] == "0.00"

    def test_valid_table_row_format_2(self, parser):
        # Date | Narration | Withdrawal | Deposit | Balance
        table = [
            ["02-01-2026", "SALARY", "0.00", "50000.00", "60000.00"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 1
        assert rows[0]["description"] == "SALARY"
        assert rows[0]["credit"] == "50000.00"

    def test_skips_header_and_junk(self, parser):
        table = [
            ["Date", "Narration"], # Too short
            ["Transaction Date", "Details", "Ref", "Val", "Dr", "Cr", "Bal"], # Header
            ["", "", "", "", "", "", ""], # Empty
            ["01/01/26", "valid", "ref", "01/01/26", "10", "20", "30"] # Valid
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 1

class TestHDFCParseText:
    def test_regex_extraction(self, parser):
        text = "01/01/2026 AMZN MKTP 500.00  10000.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "01/01/2026"
        assert "AMZN" in rows[0]["description"]
        assert rows[0]["debit"] == "500.00"
        assert rows[0]["balance"] == "10000.00"

    def test_regex_extraction_credit(self, parser):
        text = "02/01/2026 INTEREST  100.00 10100.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["credit"] == "100.00"
