from typing import List
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.statement import Statement


def detect_recurring(db: Session, statement_ids: List[int]) -> List[dict]:
    """
    Detect recurring payments across multiple statements.
    Groups by (merchant, ~amount) and flags combos appearing in 2+ months.
    """
    if not statement_ids:
        return []

    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id.in_(statement_ids))
        .filter(Transaction.debit > 0)
        .all()
    )

    # Group by merchant
    merchant_months = {}
    for txn in transactions:
        if not txn.merchant:
            continue

        stmt = db.query(Statement).filter(Statement.id == txn.statement_id).first()
        if not stmt:
            continue

        key = txn.merchant.lower().strip()
        amount = float(txn.debit or 0)
        month_label = f"{['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stmt.month]} {stmt.year}"

        if key not in merchant_months:
            merchant_months[key] = {
                "merchant": txn.merchant,
                "amounts": [],
                "months": set(),
            }

        merchant_months[key]["amounts"].append(amount)
        merchant_months[key]["months"].add(month_label)

    # Filter for recurring (2+ months with similar amounts)
    recurring = []
    for key, data in merchant_months.items():
        if len(data["months"]) >= 2:
            avg_amount = sum(data["amounts"]) / len(data["amounts"])

            # Check if amounts are consistent (within ±5%)
            consistent = all(
                abs(a - avg_amount) / avg_amount < 0.05
                for a in data["amounts"]
            ) if avg_amount > 0 else False

            if consistent or len(data["months"]) >= 3:
                recurring.append({
                    "merchant": data["merchant"],
                    "amount": round(avg_amount, 2),
                    "months": sorted(list(data["months"])),
                    "type": "subscription" if avg_amount < 2000 else "emi",
                })

    return recurring
