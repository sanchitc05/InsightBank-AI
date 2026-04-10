"""Diagnostic: run SBI parser against the actual OCR text."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, ".")

from app.parsers.sbi_parser import SBIParser

# Read the OCR output we saved
with open("debug_ocr_output.txt", "r", encoding="utf-8") as f:
    ocr_text = f.read()

parser = SBIParser()
rows = parser.parse_text(ocr_text)

print(f"Rows found: {len(rows)}")
for i, row in enumerate(rows):
    print(f"  [{i+1}] {row}")
