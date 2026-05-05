from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionListResponse, TransactionResponse, TransactionSummary

from app.models.statement import Statement
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.analytics_service import format_period, parse_month_filter

router = APIRouter()


@router.get("/transactions", response_model=TransactionListResponse)
def list_transactions(
    statement_id: Optional[int] = None,
    month: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List transactions with filtering, search, and pagination."""
    query = db.query(Transaction).join(Statement).filter(Statement.user_id == current_user.id)
    parsed_month = parse_month_filter(month)

    # Apply filters
    if statement_id:
        query = query.filter(Transaction.statement_id == statement_id)
    if parsed_month:
        year, month_value = parsed_month
        query = query.filter(Statement.year == year, Statement.month == month_value)
    if category:
        query = query.filter(Transaction.category == category)
    if type == "debit":
        query = query.filter(Transaction.debit > 0)
    elif type == "credit":
        query = query.filter(Transaction.credit > 0)
    if search:
        query = query.filter(Transaction.description.like(f"%{search}%"))
    if date_from:
        query = query.filter(Transaction.txn_date >= date_from)
    if date_to:
        query = query.filter(Transaction.txn_date <= date_to)
    if min_amount is not None:
        query = query.filter(
            (Transaction.debit >= min_amount) | (Transaction.credit >= min_amount)
        )
    if max_amount is not None:
        query = query.filter(
            (Transaction.debit <= max_amount) & (Transaction.credit <= max_amount)
        )

    totals = query.with_entities(
        func.sum(Transaction.debit).label("total_debit"),
        func.sum(Transaction.credit).label("total_credit"),
    ).first()

    total = query.count()
    offset = (page - 1) * page_size
    transactions = (
        query.order_by(Transaction.txn_date.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    period = month or "all-time"
    if statement_id and month is None:
        statement = (
            db.query(Statement)
            .filter(Statement.id == statement_id, Statement.user_id == current_user.id)
            .first()
        )
        if statement:
            period = format_period(statement.year, statement.month)

    return TransactionListResponse(
        period=period,
        total=total,
        page=page,
        page_size=page_size,
        summary=TransactionSummary(
            total_debit=float(totals.total_debit or 0),
            total_credit=float(totals.total_credit or 0),
        ),
        data=[TransactionResponse.model_validate(t) for t in transactions],
    )
