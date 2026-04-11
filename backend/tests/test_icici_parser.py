import pytest
from app.parsers.icici_parser import ICICIParser

@pytest.fixture
def parser():
    return ICICIParser()

class TestICICIParseTable:
    def test_valid_table_format_1(self, parser):
        # Date | Remarks | Amount | Type(Dr/Cr) | Balance
        table = [
            ["Date", "Transaction Remarks", "Amount (INR)", "Type (Dr/Cr)", "Balance (INR)"],
            ["01-01-2026", "SWIGGY PAYMENT", "250.00", "DR", "9750.00"],
            ["02-01-2026", "CASH DEPOSIT", "1000.00", "CR", "10750.00"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 2
        assert rows[0]["debit"] == 250.0
        assert rows[1]["credit"] == 1000.0
        assert rows[0]["description"] == "SWIGGY PAYMENT"

    def test_valid_table_format_2(self, parser):
        # Date | Particulars | Withdrawal | Deposit | Balance
        table = [
            ["03/01/2026", "NEFT TRANSFER", "5000.00", "0.00", "5750.00"],
        ]
        rows = parser.parse_table(table)
        assert len(rows) == 1
        assert rows[0]["debit"] == "5000.00"
        assert rows[0]["credit"] == "0.00"

class TestICICIParseText:
    def test_regex_extraction(self, parser):
        text = "01-01-2026 UPI/PAYMENT/123  150.00 DR 9600.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["date"] == "01-01-2026"
        assert rows[0]["debit"] == 150.0
        assert rows[0]["credit"] == 0
        assert rows[0]["balance"] == "9600.00"

    def test_regex_extraction_credit(self, parser):
        text = "02-01-2026 INT.PAYMENT  50.00 CR 9650.00"
        rows = parser.parse_text(text)
        assert len(rows) == 1
        assert rows[0]["credit"] == 50.0
        assert rows[0]["debit"] == 0
