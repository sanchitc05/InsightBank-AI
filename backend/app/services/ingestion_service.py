import asyncio
import logging
import os
import math
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.parsers.parser_factory import detect_bank, get_parser
from app.parsers.ocr_extractor import OCRExtractor
from app.analytics.categorizer import Categorizer
from app.parsers.base_parser import ParserError
from app.exceptions import StatementParsingException

logger = logging.getLogger(__name__)

class IngestionService:
    """Service to handle bank statement ingestion and lifecycle management."""

    @staticmethod
    def _safe_float(val) -> float:
        """Convert value to float, treating NaN/None/empty as 0.0."""
        if val is None:
            return 0.0
        try:
            f = float(val)
            return 0.0 if math.isnan(f) else f
        except (ValueError, TypeError):
            return 0.0

    @classmethod
    async def process_statement_task(cls, statement_id: int, file_path: str):
        """
        Background task to process a statement.
        Uses its own database session to avoid thread-safety issues.
        """
        with SessionLocal() as db:
            statement = db.query(Statement).filter(Statement.id == statement_id).first()
            if not statement:
                logger.error(f"Statement ID {statement_id} not found for background processing.")
                return

            try:
                # 1. Update status to PROCESSING
                statement.status = "PROCESSING"
                db.commit()
                logger.info(f"Processing statement {statement_id} ({statement.file_name})")

                # 2. Check if scanned (CPU-bound)
                is_scanned = await asyncio.to_thread(OCRExtractor.is_likely_scanned, file_path)
                
                # 3. Detect bank (CPU-bound)
                try:
                    bank_name = await asyncio.to_thread(detect_bank, file_path)
                    logger.debug(f"Detected bank: {bank_name} for statement {statement_id}")
                except Exception as e:
                    logger.warning(f"Bank detection failed for {file_path}: {e}")
                    bank_name = "GENERIC"

                # 4. Run OCR if scanned (CPU-bound)
                ocr_text = None
                if is_scanned:
                    tesseract_exe = OCRExtractor.find_tesseract()
                    if not tesseract_exe:
                        raise StatementParsingException(
                            detail="Scanned PDF detected but Tesseract OCR is not installed.",
                            parser="OCR_ENGINE",
                            context={"error_code": "OCR_MISSING"}
                        )
                    
                    logger.info(f"Running OCR on scanned statement {statement_id}")
                    ocr_engine = OCRExtractor()
                    ocr_text = await asyncio.to_thread(ocr_engine.extract_from_pdf, file_path)

                # 5. Get Parser and extract account number
                parser = get_parser(bank_name)
                # 6. Parse transactions (CPU-bound)
                try:
                    df = await asyncio.to_thread(parser.parse, file_path, ocr_text=ocr_text)
                except ParserError as e:
                    raise StatementParsingException(
                        detail=str(e),
                        parser=bank_name,
                        context={"error_code": "PARSER_FAILURE"}
                    )

                if df.empty:
                    raise StatementParsingException(
                        detail=f"No transactions found in {bank_name} statement.",
                        parser=bank_name,
                        context={"error_code": "EMPTY_STATEMENT"}
                    )

                # 7. Extract period details (Month/Year) and Account Number
                # Prioritize metadata from parser if available
                parser_meta = getattr(parser, "metadata", {})
                schema_account_num = parser_meta.get("account_number")
                
                # If parser didn't find it during parse, try the standalone method (legacy/fallback)
                if not schema_account_num:
                    schema_account_num = await asyncio.to_thread(parser.extract_account_number, file_path, ocr_text=ocr_text)

                month = statement.month
                year = statement.year
                
                # Try to get period from parser metadata
                parser_period = parser_meta.get("period")
                if parser_period:
                    month = parser_period.get("month", month)
                    year = parser_period.get("year", year)
                elif "date" in df.columns and not df["date"].dropna().empty:
                    # Fallback to first transaction date
                    first_date = df["date"].dropna().iloc[0]
                    if isinstance(first_date, str):
                        from app.parsers.base_parser import BaseParser
                        first_date = BaseParser.parse_date_static(first_date)
                    
                    if first_date:
                        month = first_date.month
                        year = first_date.year

                # 8. Check for existing statement (Duplicate Detection)
                # (account_number, month, year, user_id)
                if schema_account_num:
                    existing = db.query(Statement).filter(
                        Statement.account_number == schema_account_num,
                        Statement.month == month,
                        Statement.year == year,
                        Statement.user_id == statement.user_id,
                        Statement.id != statement.id,
                        Statement.status != "FAILED"
                    ).first()

                    if existing:
                        logger.warning(f"Duplicate statement detected: ID {statement_id} is for same period as {existing.id}")
                        statement.status = "FAILED"
                        statement.error_log = f"A statement for this account ({schema_account_num}) for {month}/{year} already exists (ID: {existing.id})."
                        db.commit()
                        return

                # Update statement metadata
                statement.month = month
                statement.year = year
                statement.account_number = schema_account_num
                statement.bank_name = bank_name

                # 9. Compute totals
                total_credit = cls._safe_float(df["credit"].sum()) if "credit" in df.columns else 0.0
                total_debit = cls._safe_float(df["debit"].sum()) if "debit" in df.columns else 0.0
                
                statement.total_credit = total_credit
                statement.total_debit = total_debit

                # 10. Save transactions with deduplication & categorization
                categorizer = Categorizer(db)
                txn_count = 0
                
                for _, row in df.iterrows():
                    description = str(row.get("description", "")) if row.get("description") else ""
                    debit = cls._safe_float(row.get("debit", 0))
                    credit = cls._safe_float(row.get("credit", 0))
                    balance = cls._safe_float(row.get("balance", 0))

                    # Parse transaction date
                    txn_date = row.get("date")
                    if isinstance(txn_date, str):
                        from app.parsers.base_parser import BaseParser
                        txn_date = BaseParser.parse_date_static(txn_date)

                    # Simple Deduplication within same statement (if any)
                    # We skip the heavy cross-statement check here for speed, 
                    # as we already validated the statement level uniqueness.
                    
                    category = categorizer.categorize(description)
                    merchant = Categorizer.extract_merchant(description)

                    txn = Transaction(
                        statement_id=statement_id,
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

                # 11. Mark SUCCESS
                statement.status = "SUCCESS"
                
                try:
                    db.commit()
                    logger.info(f"Successfully processed statement {statement_id}. Added {txn_count} transactions.")
                except IntegrityError as ie:
                    db.rollback()
                    logger.error(f"IntegrityError during commit for statement {statement_id}: {str(ie)}")
                    statement.status = "FAILED"
                    statement.error_log = "Processing conflict: Likely a duplicate statement was processed in parallel."
                    db.commit()

            except StatementParsingException as e:
                logger.error(f"Processing failed for statement {statement_id}: {e.detail}")
                statement.status = "FAILED"
                statement.error_log = e.detail
                db.commit()
            except Exception as e:
                logger.exception(f"Unexpected error processing statement {statement_id}")
                statement.status = "FAILED"
                statement.error_log = f"Unexpected error: {str(e)}"
                db.commit()

async def process_bank_statement(statement_id: int, file_path: str):
    """Standalone wrapper for background tasks."""
    await IngestionService.process_statement_task(statement_id, file_path)
