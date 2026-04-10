"""Diagnostic: run OCR on the scanned PDF and dump the raw text."""
import sys, io, asyncio
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add app to path
sys.path.insert(0, ".")

from app.parsers.ocr_extractor import OCRExtractor

PDF_PATH = r"D:\Downloads\statement.pdf"

async def main():
    ocr = OCRExtractor()
    print(f"Tesseract available: {ocr.tesseract_available}")
    
    text = await ocr.extract_from_pdf(PDF_PATH)
    
    print(f"\nOCR text length: {len(text)}")
    print(f"OCR text lines: {len(text.splitlines())}")
    print("\n" + "=" * 80)
    print("FULL OCR OUTPUT (first 200 lines):")
    print("=" * 80)
    for i, line in enumerate(text.splitlines()):
        if i < 200:
            print(f"  L{i+1:03d}: {line!r}")
        else:
            print(f"  ... truncated at 200 lines (total {len(text.splitlines())})")
            break
    
    # Also save to file for full inspection
    with open("debug_ocr_output.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print(f"\nFull OCR output saved to debug_ocr_output.txt")

asyncio.run(main())
