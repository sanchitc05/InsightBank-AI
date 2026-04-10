"""
Shared analytics helpers used by both the analytics and insights routers.

Centralises summary / category-breakdown computation so the logic lives
in exactly one place (DRY).
"""

import calendar
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.statement import Statement
from app.models.category import Category
from app.schemas.schemas import AnalyticsSummary, CategoryBreakdown


def round_decimal(value, places=2):
    """Helper to round Decimal to fixed places and return as float."""
    if value is None:
        return 0.0
    return float(round(Decimal(str(value)), places))


def compute_summary(db: Session, stmt_id: int) -> AnalyticsSummary:
    """Compute analytics summary for a single statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .order_by(Transaction.txn_date.asc())
        .all()
    )

    if not transactions:
        return AnalyticsSummary(
            total_income=0, total_expense=0, savings=0, savings_rate=0,
            top_category="N/A", daily_avg_spend=0, transaction_count=0,
            opening_balance=0, closing_balance=0,
        )

    total_income = sum(float(t.credit or 0) for t in transactions)
    total_expense = sum(float(t.debit or 0) for t in transactions)
    savings = total_income - total_expense
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    # Top category by debit
    cat_totals: dict[str, float] = {}
    for t in transactions:
        if t.debit and float(t.debit) > 0:
            cat_totals[t.category] = cat_totals.get(t.category, 0) + float(t.debit)
    top_category = max(cat_totals, key=cat_totals.get) if cat_totals else "N/A"

    # Days in month
    days_in_month = calendar.monthrange(stmt.year, stmt.month)[1]
    daily_avg_spend = total_expense / days_in_month if days_in_month > 0 else 0

    opening_balance = float(transactions[0].balance or 0)
    closing_balance = float(transactions[-1].balance or 0)

    return AnalyticsSummary(
        total_income=round(total_income, 2),
        total_expense=round(total_expense, 2),
        savings=round(savings, 2),
        savings_rate=round(savings_rate, 1),
        top_category=top_category,
        daily_avg_spend=round(daily_avg_spend, 2),
        transaction_count=len(transactions),
        opening_balance=round(opening_balance, 2),
        closing_balance=round(closing_balance, 2),
    )


def compute_categories(db: Session, stmt_id: int) -> list[CategoryBreakdown]:
    """Compute category breakdown for a single statement."""
    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .all()
    )

    cat_data: dict[str, dict] = {}
    total_debit = 0.0
    for t in transactions:
        if t.debit and float(t.debit) > 0:
            cat = t.category or "Uncategorized"
            if cat not in cat_data:
                cat_data[cat] = {"total": 0.0, "count": 0}
            cat_data[cat]["total"] += float(t.debit)
            cat_data[cat]["count"] += 1
            total_debit += float(t.debit)

    # Get category colours / icons from DB
    categories = {c.name: c for c in db.query(Category).all()}

    result = []
    for cat_name, data in sorted(cat_data.items(), key=lambda x: x[1]["total"], reverse=True):
        cat_info = categories.get(cat_name)
        result.append(CategoryBreakdown(
            category=cat_name,
            total=round(data["total"], 2),
            count=data["count"],
            percentage=round(data["total"] / total_debit * 100, 1) if total_debit > 0 else 0,
            color=cat_info.color if cat_info else "#999999",
            icon=cat_info.icon if cat_info else "📌",
        ))

    return result
