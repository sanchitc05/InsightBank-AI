"""Diagnostic script: extract raw text from the user's PDF to understand format."""
import pdfplumber
import sys
import io

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

PDF_PATH = r"D:\Downloads\statement.pdf"

print("=" * 80)
print(f"ANALYZING: {PDF_PATH}")
print("=" * 80)

with pdfplumber.open(PDF_PATH) as pdf:
    print(f"\nTotal pages: {len(pdf.pages)}\n")

    for i, page in enumerate(pdf.pages):
        print(f"\n{'-' * 80}")
        print(f"PAGE {i+1}")
        print(f"{'-' * 80}")

        # -- Tables --
        tables = page.extract_tables()
        if tables:
            print(f"\n  [TABLES] Found {len(tables)} table(s):")
            for ti, table in enumerate(tables):
                print(f"\n    Table {ti+1} ({len(table)} rows):")
                for ri, row in enumerate(table):
                    if ri < 30:
                        print(f"      Row {ri}: {row}")
                    elif ri == 30:
                        print(f"      ... ({len(table) - 30} more rows)")
        else:
            print("\n  [TABLES] No tables detected on this page.")

        # -- Raw text --
        text = page.extract_text()
        if text:
            lines = text.split("\n")
            print(f"\n  [TEXT] {len(lines)} lines extracted:")
            for li, line in enumerate(lines):
                if li < 50:
                    print(f"    L{li+1:03d}: {line!r}")
                elif li == 50:
                    print(f"    ... ({len(lines) - 50} more lines)")
        else:
            print("\n  [TEXT] No text extracted from this page (likely scanned).")

print("\n" + "=" * 80)
print("DONE")
