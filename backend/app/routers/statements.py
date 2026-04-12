import math
import os
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.schemas.schemas import (
    StatementResponse, 
    StatementUploadResponse, 
    ParserErrorResponse, 
    ErrorResponse
)
from app.parsers.parser_factory import detect_bank, get_parser
from app.analytics.categorizer import Categorizer
from app.parsers.base_parser import ParserError
from app.exceptions import StatementParsingException, ParserErrorResponse
from app.services.ingestion_service import process_bank_statement

# Setup logger
logger = logging.getLogger(__name__)


router = APIRouter()


def _safe_float(val) -> float:
    """Convert value to float, treating NaN/None/empty as 0.0.

    Python's float('nan') is truthy, so the common `or 0` guard
    does NOT catch it.  This helper does.
    """
    if val is None:
        return 0.0
    try:
        f = float(val)
        return 0.0 if math.isnan(f) else f
    except (ValueError, TypeError):
        return 0.0

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.post(
    "/statements/upload", 
    response_model=StatementUploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file type or request parameter"}
    }
)
async def upload_statement(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Upload a bank statement (PDF/CSV), and process it in the background."""
    allowed_extensions = {".pdf", ".csv"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF and CSV files are accepted")

    # Save file with UUID name
    saved_name = f"{uuid.uuid4()}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    content = await file.read()
    with open(saved_path, "wb") as f:
        f.write(content)

    try:
        # 1. Detect bank name synchronously. This prevents NULL bank_name in DB.
        detected_bank = detect_bank(saved_path) or "GENERIC"

        db_statement = Statement(
            bank_name=detected_bank,
            month=datetime.now().month,
            year=datetime.now().year,
            user_id=current_user.id,
            file_name=saved_name,
            total_credit=0.0,
            total_debit=0.0,
            status="PENDING"
        )
        db.add(db_statement)
        
        try:
            db.commit()
            db.refresh(db_statement)
        except IntegrityError as e:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Database integrity error: {str(e.orig)}. Please ensure all required fields are provided."
            )

        # 3. Start background task
        background_tasks.add_task(process_bank_statement, db_statement.id, saved_path)

        return StatementUploadResponse(
            statement_id=db_statement.id,
            status="PENDING",
            bank_name=detected_bank
        )

    except Exception as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        logger.critical(f"Error in upload_statement: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

    except StatementParsingException as spe:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        logger.error(f"Statement parsing error in upload_statement: {spe.detail}")
        raise spe
    except ParserError as e:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        logger.error(f"Parser error in upload_statement: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException as he:
        # Clean up file on expected errors too if needed, or just re-raise
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise he
    except Exception as e:
        # Clean up file on error
        if os.path.exists(saved_path):
            os.remove(saved_path)
        logger.critical(f"CRITICAL ERROR in upload_statement: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error during PDF processing")


@router.get("/statements", response_model=list[StatementResponse])
def list_statements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List all uploaded statements ordered by year desc, month desc."""
    statements = (
        db.query(Statement)
        .filter(Statement.user_id == current_user.id)
        .order_by(Statement.year.desc(), Statement.month.desc())
        .all()
    )
    return statements


@router.get("/statements/{stmt_id}", response_model=StatementResponse)
def get_statement(stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single statement by ID."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return stmt


@router.delete("/statements/{stmt_id}")
def delete_statement(stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a statement and all its transactions (cascade)."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Also delete the uploaded file
    file_path = os.path.join(UPLOAD_DIR, stmt.file_name)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(stmt)
    db.commit()
    return {"message": "Deleted successfully"}
