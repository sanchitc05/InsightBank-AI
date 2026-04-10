"""End-to-end test: PDF → OCR → Parser → Transactions."""
import sys, io, asyncio
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, ".")

from app.parsers.sbi_parser import SBIParser
from app.parsers.ocr_extractor import OCRExtractor

PDF_PATH = r"D:\Downloads\statement.pdf"

async def main():
    # Step 1: OCR
    ocr = OCRExtractor()
    print(f"Tesseract available: {ocr.tesseract_available}")
    text = await ocr.extract_from_pdf(PDF_PATH)
    print(f"OCR text length: {len(text)} chars, {len(text.splitlines())} lines")

    # Step 2: Parse
    parser = SBIParser()
    rows = parser.parse_text(text)
    
    print(f"\n{'='*80}")
    print(f"RESULTS: {len(rows)} transactions extracted")
    print(f"{'='*80}")
    
    total_credit = 0
    total_debit = 0
    for i, row in enumerate(rows):
        c = float(row['credit'].replace(',', '')) if row['credit'] else 0
        d = float(row['debit'].replace(',', '')) if row['debit'] else 0
        total_credit += c
        total_debit += d
        typ = "CR" if row['credit'] else "DR"
        amt = row['credit'] or row['debit']
        print(f"  [{i+1:2d}] {row['date']}  {typ}  {amt:>10s}  bal={row['balance']:>10s}  {row['description'][:50]}")
    
    print(f"\n  Total credits:  {total_credit:,.2f}")
    print(f"  Total debits:   {total_debit:,.2f}")
    print(f"  Net flow:       {total_credit - total_debit:,.2f}")
    
    # Verify: opening 2000 + credits - debits = closing 2021.03
    expected_closing = 2000 + total_credit - total_debit
    print(f"\n  Opening balance: 2,000.00")
    print(f"  Expected closing: {expected_closing:,.2f}")
    print(f"  Actual closing:   2,021.03")
    print(f"  Match: {'✓ YES' if abs(expected_closing - 2021.03) < 0.01 else '✗ NO'}")

asyncio.run(main())
