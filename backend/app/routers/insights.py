from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.analytics.trend_analyzer import detect_recurring
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.database import get_db
from app.models.insight import Insight
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.schemas import (
    AnalyticsSummary,
    CategoryBreakdown,
    CategoryBreakdownResponse,
    CompareResponse,
    InsightGenerateResponse,
    InsightListResponse,
    InsightResponse,
    StatementResponse,
    TrendResponse,
)
from app.services.analytics_service import (
    compute_categories,
    compute_summary,
    compute_user_categories,
    compute_user_summary,
    compute_user_trend,
    parse_month_filter,
)

router = APIRouter()


@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary_for_period(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics summary for all months or a specific YYYY-MM period."""
    return compute_user_summary(db, current_user.id, month=month)


@router.get("/analytics/summary/{stmt_id}", response_model=AnalyticsSummary)
def get_analytics_summary(
    stmt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get analytics summary for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return compute_summary(db, stmt_id)


@router.get("/analytics/categories", response_model=CategoryBreakdownResponse)
def get_analytics_categories_for_period(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get category breakdown for all months or a specific YYYY-MM period."""
    return {
        "period": month or "all-time",
        "data": compute_user_categories(db, current_user.id, month=month),
    }


@router.get("/analytics/categories/{stmt_id}", response_model=list[CategoryBreakdown])
def get_analytics_categories(
    stmt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get category breakdown for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return compute_categories(db, stmt_id)


@router.get("/analytics/trend", response_model=TrendResponse)
def get_analytics_trend(
    month: Optional[str] = None,
    bank_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get income/expense trend across all months or a specific YYYY-MM period."""
    return {
        "period": month or "all-time",
        "data": compute_user_trend(db, current_user.id, month=month, bank_name=bank_name),
    }


@router.get("/analytics/compare", response_model=CompareResponse)
def get_analytics_compare(
    ids: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare two or more statements side by side."""
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if len(id_list) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 statement IDs")

    statements = []
    summaries = []
    all_categories = []

    for stmt_id in id_list:
        stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
        if not stmt:
            raise HTTPException(status_code=404, detail=f"Statement {stmt_id} not found")
        statements.append(StatementResponse.model_validate(stmt))
        summaries.append(compute_summary(db, stmt_id))
        all_categories.append(compute_categories(db, stmt_id))

    return {
        "statements": statements,
        "summary": summaries,
        "categories": all_categories,
    }


@router.get("/insights", response_model=InsightListResponse)
def get_insights_for_period(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get insights for all statements or a specific YYYY-MM period."""
    parsed_month = parse_month_filter(month)
    severity_priority = {
        "alert": 0,
        "warn": 1,
        "info": 2,
    }

    query = (
        db.query(Insight)
        .join(Statement, Insight.statement_id == Statement.id)
        .filter(Statement.user_id == current_user.id)
    )
    if parsed_month:
        year, month_value = parsed_month
        query = query.filter(Statement.year == year, Statement.month == month_value)

    insights = query.all()
    insights.sort(key=lambda item: severity_priority.get(item.severity, 3))

    return {
        "period": month or "all-time",
        "insights": insights,
    }


@router.get("/insights/{stmt_id}", response_model=list[InsightResponse])
def get_insights(
    stmt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all insights for a statement, ordered by severity priority."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    severity_priority = {
        "alert": 0,
        "warn": 1,
        "info": 2,
    }

    insights = db.query(Insight).filter(Insight.statement_id == stmt_id).all()
    insights.sort(key=lambda item: severity_priority.get(item.severity, 3))
    return insights


@router.post("/insights/generate/{stmt_id}", response_model=InsightGenerateResponse)
@limiter.limit("1/minute")
def generate_insights(
    request: Request,
    stmt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate AI insights for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    transactions = db.query(Transaction).filter(Transaction.statement_id == stmt_id).all()
    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="No transactions found for this statement. Upload a statement first.",
        )

    import pandas as pd

    df = pd.DataFrame(
        [
            {
                "txn_date": txn.txn_date,
                "description": txn.description,
                "debit": float(txn.debit or 0),
                "credit": float(txn.credit or 0),
                "balance": float(txn.balance or 0),
                "category": txn.category,
                "merchant": txn.merchant,
            }
            for txn in transactions
        ]
    )

    from app.analytics.insights_engine import InsightsEngine

    engine = InsightsEngine(df, stmt_id)
    insights_data = engine.generate_all()

    db.query(Insight).filter(Insight.statement_id == stmt_id).delete()

    created_insights = []
    for ins in insights_data:
        insight = Insight(
            statement_id=stmt_id,
            type=ins["type"],
            title=ins["title"],
            body=ins["body"],
            severity=ins["severity"],
        )
        db.add(insight)
        db.flush()
        created_insights.append(InsightResponse.model_validate(insight))

    all_bank_statements = db.query(Statement).filter(Statement.bank_name == stmt.bank_name).all()
    all_stmt_ids = [statement.id for statement in all_bank_statements]
    recurring_payments = detect_recurring(db, all_stmt_ids)

    for recurring in recurring_payments:
        months_str = ", ".join(recurring["months"])
        body = (
            f"₹{recurring['amount']} detected in {recurring['count']} months "
            f"({months_str}). Likely a {recurring['type']}."
        )

        insight = Insight(
            statement_id=stmt_id,
            type="pattern",
            title=f"Recurring Payment: {recurring['merchant']}",
            body=body,
            severity="info",
        )
        db.add(insight)
        db.flush()
        created_insights.append(InsightResponse.model_validate(insight))

    db.commit()

    return InsightGenerateResponse(
        statement_id=stmt_id,
        generated=len(insights_data),
        insights=created_insights,
    )
