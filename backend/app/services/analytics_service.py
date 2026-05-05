"""
Shared analytics helpers used by both the analytics and insights routers.

Centralises summary, category-breakdown, and month-filter computation
so the logic lives in exactly one place.
"""

import calendar
import re
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.schemas.schemas import AnalyticsSummary, CategoryBreakdown, TrendPoint

MONTH_FILTER_RE = re.compile(r"^\d{4}-\d{2}$")


def round_decimal(value, places=2):
    """Helper to round Decimal to fixed places and return as float."""
    if value is None:
        return 0.0
    return float(round(Decimal(str(value)), places))


def format_period(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def parse_month_filter(month: Optional[str]) -> Optional[tuple[int, int]]:
    if month is None:
        return None
    if not MONTH_FILTER_RE.match(month):
        raise HTTPException(status_code=422, detail="Invalid month format. Use YYYY-MM.")

    year_text, month_text = month.split("-")
    year = int(year_text)
    month_value = int(month_text)
    if month_value < 1 or month_value > 12:
        raise HTTPException(status_code=422, detail="Invalid month format. Use YYYY-MM.")
    return year, month_value


def build_transactions_query(db: Session, user_id: int, month: Optional[str] = None):
    query = (
        db.query(Transaction)
        .join(Statement, Transaction.statement_id == Statement.id)
        .filter(Statement.user_id == user_id)
    )
    parsed = parse_month_filter(month)
    if parsed:
        year, month_value = parsed
        query = query.filter(Statement.year == year, Statement.month == month_value)
    return query


def build_statements_query(
    db: Session,
    user_id: int,
    month: Optional[str] = None,
    bank_name: Optional[str] = None,
):
    query = db.query(Statement).filter(Statement.user_id == user_id)
    parsed = parse_month_filter(month)
    if parsed:
        year, month_value = parsed
        query = query.filter(Statement.year == year, Statement.month == month_value)
    if bank_name:
        query = query.filter(Statement.bank_name == bank_name)
    return query


def _get_period_days(statements: list[Statement], month: Optional[str]) -> int:
    periods = {(stmt.year, stmt.month) for stmt in statements}
    if not periods and month:
        periods.add(parse_month_filter(month))
    return sum(calendar.monthrange(year, month_value)[1] for year, month_value in periods)


def _build_summary(
    transactions: list[Transaction],
    period: str,
    period_days: int,
) -> AnalyticsSummary:
    if not transactions:
        return AnalyticsSummary(
            period=period,
            total_income=0,
            total_expense=0,
            savings=0,
            savings_rate=0,
            top_category="N/A",
            daily_avg_spend=0,
            transaction_count=0,
            opening_balance=0,
            closing_balance=0,
        )

    total_income = sum(float(txn.credit or 0) for txn in transactions)
    total_expense = sum(float(txn.debit or 0) for txn in transactions)
    savings = total_income - total_expense
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    category_totals: dict[str, float] = {}
    for txn in transactions:
        debit = float(txn.debit or 0)
        if debit <= 0:
            continue
        category = txn.category or "Uncategorized"
        category_totals[category] = category_totals.get(category, 0) + debit

    top_category = max(category_totals, key=category_totals.get) if category_totals else "N/A"
    daily_avg_spend = total_expense / period_days if period_days > 0 else 0
    opening_balance = float(transactions[0].balance or 0)
    closing_balance = float(transactions[-1].balance or 0)

    return AnalyticsSummary(
        period=period,
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


def compute_summary(db: Session, stmt_id: int) -> AnalyticsSummary:
    """Compute analytics summary for a single statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .order_by(Transaction.txn_date.asc(), Transaction.id.asc())
        .all()
    )
    period = format_period(stmt.year, stmt.month)
    period_days = calendar.monthrange(stmt.year, stmt.month)[1]
    return _build_summary(transactions, period=period, period_days=period_days)


def compute_user_summary(db: Session, user_id: int, month: Optional[str] = None) -> AnalyticsSummary:
    period = month or "all-time"
    statements = build_statements_query(db, user_id, month=month).all()
    transactions = (
        build_transactions_query(db, user_id, month=month)
        .order_by(Transaction.txn_date.asc(), Transaction.id.asc())
        .all()
    )
    return _build_summary(transactions, period=period, period_days=_get_period_days(statements, month))


def _build_category_breakdown(db: Session, transactions: list[Transaction]) -> list[CategoryBreakdown]:
    category_data: dict[str, dict[str, float | int]] = {}
    total_debit = 0.0

    for txn in transactions:
        debit = float(txn.debit or 0)
        if debit <= 0:
            continue
        category = txn.category or "Uncategorized"
        if category not in category_data:
            category_data[category] = {"total": 0.0, "count": 0}
        category_data[category]["total"] += debit
        category_data[category]["count"] += 1
        total_debit += debit

    categories = {category.name: category for category in db.query(Category).all()}

    result = []
    for category_name, data in sorted(category_data.items(), key=lambda item: item[1]["total"], reverse=True):
        category_info = categories.get(category_name)
        result.append(
            CategoryBreakdown(
                category=category_name,
                total=round(float(data["total"]), 2),
                count=int(data["count"]),
                percentage=round(float(data["total"]) / total_debit * 100, 1) if total_debit > 0 else 0,
                color=category_info.color if category_info else "#999999",
                icon=category_info.icon if category_info else "📌",
            )
        )

    return result


def compute_categories(db: Session, stmt_id: int) -> list[CategoryBreakdown]:
    """Compute category breakdown for a single statement."""
    transactions = db.query(Transaction).filter(Transaction.statement_id == stmt_id).all()
    return _build_category_breakdown(db, transactions)


def compute_user_categories(db: Session, user_id: int, month: Optional[str] = None) -> list[CategoryBreakdown]:
    transactions = build_transactions_query(db, user_id, month=month).all()
    return _build_category_breakdown(db, transactions)


def compute_user_trend(
    db: Session,
    user_id: int,
    month: Optional[str] = None,
    bank_name: Optional[str] = None,
) -> list[TrendPoint]:
    query = (
        db.query(
            Statement.year.label("year"),
            Statement.month.label("month"),
            func.sum(Transaction.credit).label("total_income"),
            func.sum(Transaction.debit).label("total_expense"),
        )
        .join(Transaction, Transaction.statement_id == Statement.id)
        .filter(Statement.user_id == user_id)
    )

    parsed = parse_month_filter(month)
    if parsed:
        year, month_value = parsed
        query = query.filter(Statement.year == year, Statement.month == month_value)
    if bank_name:
        query = query.filter(Statement.bank_name == bank_name)

    rows = (
        query.group_by(Statement.year, Statement.month)
        .order_by(Statement.year.asc(), Statement.month.asc())
        .all()
    )

    result = []
    for row in rows:
        total_income = round_decimal(row.total_income)
        total_expense = round_decimal(row.total_expense)
        point_period = format_period(row.year, row.month)
        result.append(
            TrendPoint(
                month=row.month,
                year=row.year,
                period=point_period,
                label=f"{calendar.month_abbr[row.month]} {row.year}",
                total_income=total_income,
                total_expense=total_expense,
                savings=round(total_income - total_expense, 2),
            )
        )

    return result
