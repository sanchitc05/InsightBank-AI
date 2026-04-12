import calendar
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
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
from app.analytics.trend_analyzer import detect_recurring
from app.services.analytics_service import compute_summary, compute_categories

router = APIRouter()


# ── Analytics Endpoints ────────────────────────────────────

@router.get("/analytics/summary/{stmt_id}", response_model=AnalyticsSummary)
def get_analytics_summary(stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get analytics summary for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return compute_summary(db, stmt_id)


@router.get("/analytics/categories/{stmt_id}", response_model=list[CategoryBreakdown])
def get_analytics_categories(stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get category breakdown for a statement."""
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")
    return compute_categories(db, stmt_id)


@router.get("/analytics/trend", response_model=list[TrendPoint])
def get_analytics_trend(bank_name: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get income/expense trend across all statements."""
    query = db.query(Statement).filter(Statement.user_id == current_user.id)
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


@router.get("/analytics/compare", response_model=CompareResponse)
def get_analytics_compare(ids: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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


# ── Insight Endpoints ─────────────────────────────────────

@router.get("/insights/{stmt_id}", response_model=list[InsightResponse])
def get_insights(stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all insights for a statement, ordered by severity priority."""
    # Check if statement exists
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Query insights ordered by severity: alert (0), warn (1), info (2)
    severity_priority = {
        "alert": 0,
        "warn": 1,
        "info": 2,
    }
    
    insights = (
        db.query(Insight)
        .filter(Insight.statement_id == stmt_id)
        .all()
    )
    
    # Sort by severity priority
    insights.sort(key=lambda x: severity_priority.get(x.severity, 3))
    
    return insights


@router.post("/insights/generate/{stmt_id}", response_model=InsightGenerateResponse)
@limiter.limit("1/minute")
def generate_insights(request: Request, stmt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate AI insights for a statement."""
    # Check if statement exists and is owned by current user
    stmt = db.query(Statement).filter(Statement.id == stmt_id, Statement.user_id == current_user.id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Load transactions
    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id == stmt_id)
        .all()
    )

    # Return 422 if no transactions
    if not transactions:
        raise HTTPException(
            status_code=422,
            detail="No transactions found for this statement. Upload a statement first."
        )

    # Create DataFrame and generate insights
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

    # Delete existing insights for this statement
    db.query(Insight).filter(Insight.statement_id == stmt_id).delete()

    # Insert new insights and collect for response
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
        db.flush()  # Flush to get the ID
        
        # Create response object
        created_insights.append(InsightResponse.model_validate(insight))

    # Detect recurring payments
    # Get all statement IDs with the same bank_name
    all_bank_statements = (
        db.query(Statement)
        .filter(Statement.bank_name == stmt.bank_name)
        .all()
    )
    all_stmt_ids = [s.id for s in all_bank_statements]

    # Call detect_recurring
    recurring_payments = detect_recurring(db, all_stmt_ids)

    # For each recurring payment found, create an additional insight
    for recurring in recurring_payments:
        months_str = ", ".join(recurring["months"])
        body = f"₹{recurring['amount']} detected in {recurring['count']} months ({months_str}). Likely a {recurring['type']}."
        
        insight = Insight(
            statement_id=stmt_id,
            type="pattern",
            title=f"Recurring Payment: {recurring['merchant']}",
            body=body,
            severity="info",
        )
        db.add(insight)
        db.flush()
        
        # Create response object
        created_insights.append(InsightResponse.model_validate(insight))

    db.commit()

    return InsightGenerateResponse(
        statement_id=stmt_id,
        generated=len(insights_data),
        insights=created_insights
    )
