import pytest
import pandas as pd
from unittest.mock import MagicMock, AsyncMock, patch
from app.parsers.parser_factory import detect_bank, get_parser
from app.parsers.ocr_extractor import OCRExtractor
from app.parsers.csv_parser import CSVParser

@pytest.mark.asyncio
async def test_detect_bank_csv():
    """Test that CSV files are correctly detected."""
    assert await detect_bank("statement.csv") == "CSV"

@pytest.mark.asyncio
@patch('app.parsers.parser_factory.OCRExtractor')
@patch('pdfplumber.open')
async def test_detect_bank_ocr(mock_pdf_open, mock_ocr_class):
    # Mock PDF behavior
    mock_pdf = MagicMock()
    mock_pdf.pages = [MagicMock()]
    mock_pdf_open.return_value.__enter__.return_value = mock_pdf
    
    # Mock OCRExtractor to return specific bank keyword
    mock_ocr_instance = mock_ocr_class.return_value
    mock_ocr_instance.is_likely_scanned.return_value = True
    mock_ocr_instance.extract_from_pdf = AsyncMock(return_value="This is an ICICI BANK statement")
    
    bank = await detect_bank("scanned_icici.pdf")
    assert bank == "ICICI"

@pytest.mark.asyncio
async def test_csv_parser_mapping():
    """Test that CSV parser correctly maps common bank columns."""
    parser = CSVParser()
    
    with patch('pandas.read_csv') as mock_read:
        mock_read.return_value = pd.DataFrame([
            {'Date': '2023-01-01', 'Description': 'Rent', 'Withdrawal': '1,000', 'Deposit': '', 'Balance': '9,000'}
        ])
        df = await parser.parse("dummy.csv")
        
        assert not df.empty
        assert df.iloc[0]['debit'] == 1000.0
        assert df.iloc[0]['description'] == 'Rent'

@pytest.mark.asyncio
async def test_get_parser():
    """Test that correct parser instances are returned."""
    from app.parsers.icici_parser import ICICIParser
    from app.parsers.csv_parser import CSVParser
    
    assert isinstance(await get_parser("ICICI"), ICICIParser)
    assert isinstance(await get_parser("CSV"), CSVParser)
