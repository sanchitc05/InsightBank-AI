import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.schemas.schemas import StatementResponse, StatementUploadResponse
from app.parsers.parser_factory import detect_bank, get_parser
from app.analytics.categorizer import Categorizer

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.post("/statements/upload", response_model=StatementUploadResponse)
async def upload_statement(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a bank statement PDF, parse it, and store transactions."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Save file with UUID name
    file_ext = os.path.splitext(file.filename)[1]
    saved_name = f"{uuid.uuid4()}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    try:
        # Detect bank and parse
        bank_name = await detect_bank(saved_path)
        parser = await get_parser(bank_name)
        df = await parser.parse(saved_path)

        if df.empty:
            raise HTTPException(status_code=422, detail="No transactions found in the PDF")

        # Extract month/year from first transaction date
        if "date" in df.columns and not df["date"].dropna().empty:
            first_date = df["date"].dropna().iloc[0]
            if isinstance(first_date, str):
                from app.parsers.base_parser import BaseParser
                first_date = BaseParser.parse_date_static(first_date)
            month = first_date.month
            year = first_date.year
        else:
            month = datetime.now().month
            year = datetime.now().year

        # Compute totals
        total_credit = float(df["credit"].sum()) if "credit" in df.columns else 0.0
        total_debit = float(df["debit"].sum()) if "debit" in df.columns else 0.0

        # Extract account number (last 4 digits pattern)
        import pdfplumber
        account_number = None
        with pdfplumber.open(saved_path) as pdf:
            first_page_text = pdf.pages[0].extract_text() or ""
            import re
            # Look for account number patterns
            acc_patterns = [
                r'[Aa]ccount\s*(?:[Nn]o\.?|[Nn]umber)?\s*:?\s*[\w]*(\d{4})',
                r'A/[Cc]\s*(?:[Nn]o\.?)?\s*:?\s*[\w]*(\d{4})',
                r'(\d{4})\s*$',
            ]
            for pattern in acc_patterns:
                match = re.search(pattern, first_page_text)
                if match:
                    account_number = "XXXX" + match.group(1)
                    break

        # Check for duplicate statement
        existing = db.query(Statement).filter(
            Statement.bank_name == bank_name,
            Statement.account_number == account_number,
            Statement.month == month,
            Statement.year == year,
        ).first()

        if existing:
            # Delete old data and re-upload
            db.delete(existing)
            db.commit()

        # Create statement record
        stmt = Statement(
            bank_name=bank_name,
            account_number=account_number,
            month=month,
            year=year,
            file_name=saved_name,
            total_credit=total_credit,
            total_debit=total_debit,
        )
        db.add(stmt)
        db.commit()
        db.refresh(stmt)

        # Insert transactions
        categorizer = Categorizer(db)
        txn_count = 0
        for _, row in df.iterrows():
            description = str(row.get("description", "")) if row.get("description") else ""
            debit = float(row.get("debit", 0) or 0)
            credit = float(row.get("credit", 0) or 0)
            balance = float(row.get("balance", 0) or 0)

            # Parse date
            txn_date = row.get("date")
            if isinstance(txn_date, str):
                from app.parsers.base_parser import BaseParser
                txn_date = BaseParser.parse_date_static(txn_date)

            category = categorizer.categorize(description)
            merchant = categorizer.extract_merchant(description)

            txn = Transaction(
                statement_id=stmt.id,
                txn_date=txn_date,
                description=description,
                debit=debit,
                credit=credit,
                balance=balance,
                category=category,
                merchant=merchant,
            )
            db.add(txn)
            txn_count += 1

        db.commit()

        return StatementUploadResponse(
            statement_id=stmt.id,
            bank_name=bank_name,
            month=month,
            year=year,
            total_transactions=txn_count,
            total_credit=total_credit,
            total_debit=total_debit,
        )

    except HTTPException:
        raise
    except Exception as e:
        # Clean up file on error
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")


@router.get("/statements", response_model=list[StatementResponse])
def list_statements(db: Session = Depends(get_db)):
    """List all uploaded statements ordered by year desc, month desc."""
    statements = (
        db.query(Statement)
        .order_by(Statement.year.desc(), Statement.month.desc())
        .all()
    )
    return statements


@router.get("/statements/{stmt_id}", response_model=StatementResponse)
def get_statement(stmt_id: int, db: Session = Depends(get_db)):
    """Get a single statement by ID."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return stmt


@router.delete("/statements/{stmt_id}")
def delete_statement(stmt_id: int, db: Session = Depends(get_db)):
    """Delete a statement and all its transactions (cascade)."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Also delete the uploaded file
    file_path = os.path.join(UPLOAD_DIR, stmt.file_name)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(stmt)
    db.commit()
    return {"message": "Deleted successfully"}
