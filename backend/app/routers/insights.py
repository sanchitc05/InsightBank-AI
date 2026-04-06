import calendar
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.insight import Insight
from app.schemas.schemas import (
    AnalyticsSummary,
    CategoryBreakdown,
    TrendPoint,
    CompareResponse,
    StatementResponse,
    InsightResponse,
    InsightGenerateResponse,
)

router = APIRouter()


def _compute_summary(db: Session, stmt_id: int) -> AnalyticsSummary:
    """Compute analytics summary for a statement."""
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
    cat_totals = {}
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


def _compute_categories(db: Session, stmt_id: int) -> list[CategoryBreakdown]:
    """Compute category breakdown for a statement."""
    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .all()
    )

    cat_data = {}
    total_debit = 0
    for t in transactions:
        if t.debit and float(t.debit) > 0:
            cat = t.category or "Uncategorized"
            if cat not in cat_data:
                cat_data[cat] = {"total": 0, "count": 0}
            cat_data[cat]["total"] += float(t.debit)
            cat_data[cat]["count"] += 1
            total_debit += float(t.debit)

    # Get category colors/icons from DB
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


# ── Analytics Endpoints ────────────────────────────────────

@router.get("/analytics/summary/{stmt_id}", response_model=AnalyticsSummary)
def get_analytics_summary(stmt_id: int, db: Session = Depends(get_db)):
    """Get analytics summary for a statement."""
    return _compute_summary(db, stmt_id)


@router.get("/analytics/categories/{stmt_id}", response_model=list[CategoryBreakdown])
def get_analytics_categories(stmt_id: int, db: Session = Depends(get_db)):
    """Get category breakdown for a statement."""
    return _compute_categories(db, stmt_id)


@router.get("/analytics/trend", response_model=list[TrendPoint])
def get_analytics_trend(bank_name: Optional[str] = None, db: Session = Depends(get_db)):
    """Get income/expense trend across all statements."""
    query = db.query(Statement)
    if bank_name:
        query = query.filter(Statement.bank_name == bank_name)
    statements = query.order_by(Statement.year.asc(), Statement.month.asc()).all()

    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    result = []
    for stmt in statements:
        total_income = float(stmt.total_credit or 0)
        total_expense = float(stmt.total_debit or 0)
        result.append(TrendPoint(
            month=stmt.month,
            year=stmt.year,
            label=f"{month_names[stmt.month]} {stmt.year}",
            total_income=round(total_income, 2),
            total_expense=round(total_expense, 2),
            savings=round(total_income - total_expense, 2),
        ))

    return result


@router.get("/analytics/compare")
def get_analytics_compare(ids: str = Query(...), db: Session = Depends(get_db)):
    """Compare two or more statements side by side."""
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 statement IDs")

    statements = []
    summaries = []
    all_categories = []

    for stmt_id in id_list:
        stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
        if not stmt:
            raise HTTPException(status_code=404, detail=f"Statement {stmt_id} not found")
        statements.append(StatementResponse.model_validate(stmt))
        summaries.append(_compute_summary(db, stmt_id))
        all_categories.append(_compute_categories(db, stmt_id))

    return {
        "statements": statements,
        "summary": summaries,
        "categories": all_categories,
    }


# ── Insight Endpoints ─────────────────────────────────────

@router.get("/insights/{stmt_id}", response_model=list[InsightResponse])
def get_insights(stmt_id: int, db: Session = Depends(get_db)):
    """Get all insights for a statement, ordered by severity."""
    severity_order = {"alert": 0, "warn": 1, "info": 2}
    insights = (
        db.query(Insight)
        .filter(Insight.statement_id == stmt_id)
        .all()
    )
    insights.sort(key=lambda x: severity_order.get(x.severity, 3))
    return insights


@router.post("/insights/generate/{stmt_id}", response_model=InsightGenerateResponse)
def generate_insights(stmt_id: int, db: Session = Depends(get_db)):
    """Generate AI insights for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .all()
    )

    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions found for this statement")

    import pandas as pd
    df = pd.DataFrame([{
        "txn_date": t.txn_date,
        "description": t.description,
        "debit": float(t.debit or 0),
        "credit": float(t.credit or 0),
        "balance": float(t.balance or 0),
        "category": t.category,
        "merchant": t.merchant,
    } for t in transactions])

    from app.analytics.insights_engine import InsightsEngine
    engine = InsightsEngine(df, stmt_id)
    insights_data = engine.generate_all()

    # Delete existing insights for this statement (regenerate fresh)
    db.query(Insight).filter(Insight.statement_id == stmt_id).delete()

    # Insert new insights
    for ins in insights_data:
        insight = Insight(
            statement_id=stmt_id,
            type=ins["type"],
            title=ins["title"],
            body=ins["body"],
            severity=ins["severity"],
        )
        db.add(insight)

    db.commit()

    return InsightGenerateResponse(generated=len(insights_data))
