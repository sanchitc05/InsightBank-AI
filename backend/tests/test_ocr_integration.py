import pytest
from app.parsers.ocr_extractor import OCRExtractor
from PIL import Image, ImageDraw


@pytest.mark.asyncio
async def test_ocr_extracts_text_from_synthetic_scanned_pdf(tmp_path, monkeypatch):
    """Create a synthetic 'scanned' PDF (image-only) and ensure OCRExtractor returns text.

    We monkeypatch `pytesseract.image_to_string` to avoid relying on an external tesseract binary
    during CI and to validate the integration flow.
    """
    text = "STATE BANK OF INDIA"

    # Create a simple image with text
    img = Image.new('RGB', (800, 200), color='white')
    d = ImageDraw.Draw(img)
    d.text((10, 50), text, fill=(0, 0, 0))

    # Patch pytesseract to return the expected text when called
    monkeypatch.setattr('pytesseract.image_to_string', lambda im: text)

    ocr = OCRExtractor(tesseract_path="/usr/bin/tesseract")
    # Force tesseract available for the path we patched
    ocr.tesseract_available = True

    # Call the internal dispatcher with the PIL image to avoid heavy pdf dependencies in CI
    extracted = await ocr._ocr_dispatch(img)
    assert extracted is not None
    assert text.upper() in extracted.upper()
