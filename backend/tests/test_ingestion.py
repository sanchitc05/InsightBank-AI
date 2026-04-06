import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from app.parsers.parser_factory import detect_bank, get_parser
from app.parsers.ocr_extractor import OCRExtractor
from app.parsers.csv_parser import CSVParser

def test_detect_bank_csv():
    """Test that CSV files are correctly detected."""
    assert detect_bank("statement.csv") == "CSV"

@patch('app.parsers.ocr_extractor.pdfium.PdfDocument')
@patch('app.parsers.ocr_extractor.pytesseract.image_to_string')
@patch('pdfplumber.open')
def test_detect_bank_ocr(mock_pdf_open, mock_ocr, mock_pdfium):
    """Test detection when OCR is required for scanned PDF."""
    # Mock pdfplumber to fail text extraction (simulate scanned)
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = None
    mock_pdf.pages = [mock_page]
    mock_pdf_open.return_value.__enter__.return_value = mock_pdf
    
    # Mock OCR to return specific bank keyword
    mock_ocr.return_value = "This is an ICICI BANK statement"
    
    bank = detect_bank("scanned_icici.pdf")
    assert bank == "ICICI"

def test_csv_parser_mapping():
    """Test that CSV parser correctly maps common bank columns."""
    parser = CSVParser()
    csv_data = "Date,Description,Withdrawal,Deposit,Balance\n2023-01-01,Rent,1000,,9000"
    
    with patch('pandas.read_csv') as mock_read:
        mock_read.return_value = pd.DataFrame([
            {'Date': '2023-01-01', 'Description': 'Rent', 'Withdrawal': '1,000', 'Deposit': '', 'Balance': '9,000'}
        ])
        df = parser.parse("dummy.csv")
        
        assert not df.empty
        assert df.iloc[0]['debit'] == 1000.0
        assert df.iloc[0]['description'] == 'Rent'

def test_get_parser():
    """Test that correct parser instances are returned."""
    from app.parsers.icici_parser import ICICIParser
    from app.parsers.csv_parser import CSVParser
    
    assert isinstance(get_parser("ICICI"), ICICIParser)
    assert isinstance(get_parser("CSV"), CSVParser)
