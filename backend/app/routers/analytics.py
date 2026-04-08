import calendar
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from decimal import Decimal

from app.database import get_db
from app.models.transaction import Transaction
from app.models.statement import Statement
from app.models.category import Category

router = APIRouter()


def round_decimal(value, places=2):
    """Helper to round Decimal to fixed places and return as float."""
    if value is None:
        return 0.0
    return float(round(Decimal(str(value)), places))


@router.get("/analytics/summary/{stmt_id}")
def get_analytics_summary(stmt_id: int, db: Session = Depends(get_db)):
    """
    Get summary analytics for a statement.
    Returns: total_income, total_expense, savings, savings_rate, top_category,
    daily_avg_spend, transaction_count, opening_balance, closing_balance
    """
    # Verify statement exists
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Get all transactions for this statement, ordered by txn_date
    txns = db.query(Transaction).filter(
        Transaction.statement_id == stmt_id
    ).order_by(Transaction.txn_date.asc()).all()

    if not txns:
        return {
            "total_income": 0.0,
            "total_expense": 0.0,
            "savings": 0.0,
            "savings_rate": 0.0,
            "top_category": "N/A",
            "daily_avg_spend": 0.0,
            "transaction_count": 0,
            "opening_balance": 0.0,
            "closing_balance": 0.0,
        }

    # Calculate totals
    total_income = sum(Decimal(t.credit) for t in txns if t.credit)
    total_expense = sum(Decimal(t.debit) for t in txns if t.debit)
    savings = total_income - total_expense

    # Calculate savings rate
    savings_rate = (savings / total_income * 100) if total_income > 0 else Decimal(0)

    # Find top category by total debit
    category_totals = {}
    for txn in txns:
        if txn.debit and txn.debit > 0:
            cat = txn.category or "Uncategorized"
            category_totals[cat] = category_totals.get(cat, Decimal(0)) + Decimal(txn.debit)

    top_category = max(category_totals, key=category_totals.get) if category_totals else "N/A"

    # Calculate daily average spend
    unique_dates = set(t.txn_date for t in txns if t.txn_date)
    daily_avg_spend = total_expense / len(unique_dates) if unique_dates else Decimal(0)

    # Get opening and closing balances
    opening_balance = Decimal(txns[0].balance) if txns else Decimal(0)
    closing_balance = Decimal(txns[-1].balance) if txns else Decimal(0)

    return {
        "total_income": round_decimal(total_income),
        "total_expense": round_decimal(total_expense),
        "savings": round_decimal(savings),
        "savings_rate": round_decimal(savings_rate),
        "top_category": top_category,
        "daily_avg_spend": round_decimal(daily_avg_spend),
        "transaction_count": len(txns),
        "opening_balance": round_decimal(opening_balance),
        "closing_balance": round_decimal(closing_balance),
    }


@router.get("/analytics/categories/{stmt_id}")
def get_analytics_categories(stmt_id: int, db: Session = Depends(get_db)):
    """
    Get category breakdown for a statement.
    Returns array of categories with total, count, percentage, color, and icon.
    """
    # Verify statement exists
    stmt = db.query(Statement).filter(Statement.id == stmt_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found")

    # Get all debit transactions grouped by category
    txns = db.query(Transaction).filter(
        and_(
            Transaction.statement_id == stmt_id,
            Transaction.debit > 0
        )
    ).all()

    if not txns:
        return []

    # Group by category
    category_data = {}
    for txn in txns:
        cat = txn.category or "Uncategorized"
        if cat not in category_data:
            category_data[cat] = {"total": Decimal(0), "count": 0}
        category_data[cat]["total"] += Decimal(txn.debit)
        category_data[cat]["count"] += 1

    # Calculate total for percentage
    total_debits = sum(cd["total"] for cd in category_data.values())

    # Fetch category colors and icons
    category_info = db.query(Category).filter(
        Category.name.in_(category_data.keys())
    ).all()
    color_icon_map = {c.name: {"color": c.color or "#64748b", "icon": c.icon or "💰"} for c in category_info}

    # Build response
    result = []
    for cat_name, data in category_data.items():
        info = color_icon_map.get(cat_name, {"color": "#64748b", "icon": "💰"})
        percentage = (data["total"] / total_debits * 100) if total_debits > 0 else 0
        result.append({
            "category": cat_name,
            "total": round_decimal(data["total"]),
            "count": data["count"],
            "percentage": round_decimal(percentage),
            "color": info["color"],
            "icon": info["icon"],
        })

    # Sort by total descending
    result.sort(key=lambda x: x["total"], reverse=True)
    return result


@router.get("/analytics/trend")
def get_analytics_trend(bank_name: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get month-over-month trend data for all or filtered statements.
    Returns array of months with income, expense, and savings.
    """
    # Query all statements or filter by bank
    query = db.query(Statement)
    if bank_name:
        query = query.filter(Statement.bank_name == bank_name)

    statements = query.order_by(Statement.year.asc(), Statement.month.asc()).all()

    result = []
    for stmt in statements:
        # Get transactions for this statement
        txns = db.query(Transaction).filter(
            Transaction.statement_id == stmt.id
        ).all()

        total_income = sum(Decimal(t.credit) for t in txns if t.credit)
        total_expense = sum(Decimal(t.debit) for t in txns if t.debit)
        savings = total_income - total_expense

        month_label = f"{calendar.month_abbr[stmt.month]} {stmt.year}"

        result.append({
            "month": stmt.month,
            "year": stmt.year,
            "label": month_label,
            "bank_name": stmt.bank_name,
            "total_income": round_decimal(total_income),
            "total_expense": round_decimal(total_expense),
            "savings": round_decimal(savings),
        })

    return result


@router.get("/analytics/compare")
def get_analytics_compare(ids: str = Query(...), db: Session = Depends(get_db)):
    """
    Compare two statements by ID.
    Query param: ids="1,2"
    """
    try:
        id_list = [int(x.strip()) for x in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ids format. Use comma-separated integers.")

    if len(id_list) != 2:
        raise HTTPException(status_code=400, detail="Exactly 2 statement IDs required.")

    stmt_a = db.query(Statement).filter(Statement.id == id_list[0]).first()
    stmt_b = db.query(Statement).filter(Statement.id == id_list[1]).first()

    if not stmt_a or not stmt_b:
        raise HTTPException(status_code=404, detail="One or both statements not found.")

    # Get summaries for both
    summary_a = get_analytics_summary(id_list[0], db)
    summary_b = get_analytics_summary(id_list[1], db)

    # Get categories for both
    categories_a = get_analytics_categories(id_list[0], db)
    categories_b = get_analytics_categories(id_list[1], db)

    # Build category comparison
    cat_map_a = {c["category"]: c["total"] for c in categories_a}
    cat_map_b = {c["category"]: c["total"] for c in categories_b}
    all_cats = set(cat_map_a.keys()) | set(cat_map_b.keys())

    category_comparison = []
    for cat in all_cats:
        amount_a = cat_map_a.get(cat, 0.0)
        amount_b = cat_map_b.get(cat, 0.0)
        change_pct = ((amount_b - amount_a) / amount_a * 100) if amount_a > 0 else None

        category_comparison.append({
            "category": cat,
            "amount_a": amount_a,
            "amount_b": amount_b,
            "change_pct": change_pct,
        })

    # Sort by total descending
    category_comparison.sort(key=lambda x: (x["amount_a"] + x["amount_b"]), reverse=True)

    return {
        "statements": [
            {
                "id": stmt_a.id,
                "bank_name": stmt_a.bank_name,
                "month": stmt_a.month,
                "year": stmt_a.year,
                "total_credit": round_decimal(stmt_a.total_credit),
                "total_debit": round_decimal(stmt_a.total_debit),
            },
            {
                "id": stmt_b.id,
                "bank_name": stmt_b.bank_name,
                "month": stmt_b.month,
                "year": stmt_b.year,
                "total_credit": round_decimal(stmt_b.total_credit),
                "total_debit": round_decimal(stmt_b.total_debit),
            },
        ],
        "summary": [summary_a, summary_b],
        "category_comparison": category_comparison,
    }
