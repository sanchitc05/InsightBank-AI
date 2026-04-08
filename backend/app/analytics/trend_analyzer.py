import calendar
from typing import List
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.statement import Statement


def detect_recurring(db: Session, statement_ids: List[int]) -> List[dict]:
    """
    Detect recurring payments across multiple statements.
    A payment is recurring if the same merchant appears in 2 or more
    different statement months with an amount within ±5% of each other.

    Returns list of dicts:
    [
      {
        merchant: str,
        amount: float,          ← average amount across occurrences
        months: list[str],      ← e.g. ["Jan 2024", "Feb 2024"]
        count: int,             ← number of months it appeared
        type: str               ← "subscription" if amount < 2000 else "emi"
      }
    ]
    """
    if not statement_ids:
        return []

    # Load all debit transactions for the given statement_ids from DB
    transactions = (
        db.query(Transaction)
        .filter(Transaction.statement_id.in_(statement_ids))
        .filter(Transaction.debit > 0)
        .all()
    )

    # Group by merchant (ignore null/empty/"Unknown" merchants)
    merchant_data = {}
    for txn in transactions:
        merchant = (txn.merchant or "").strip()
        if not merchant or merchant.lower() == "unknown":
            continue

        stmt = db.query(Statement).filter(Statement.id == txn.statement_id).first()
        if not stmt:
            continue

        merchant_key = merchant.lower().strip()
        amount = float(txn.debit or 0)
        month_label = f"{calendar.month_abbr[stmt.month]} {stmt.year}"

        if merchant_key not in merchant_data:
            merchant_data[merchant_key] = {
                "merchant_name": merchant,
                "amounts": [],
                "months_set": set(),
            }

        merchant_data[merchant_key]["amounts"].append(amount)
        merchant_data[merchant_key]["months_set"].add(month_label)

    # For each merchant group, cluster amounts that are within ±5% of each other
    recurring = []
    for merchant_key, data in merchant_data.items():
        amounts = data["amounts"]
        months_set = data["months_set"]

        # Sort amounts ascending
        sorted_amounts = sorted(amounts)
        clusters = []

        for amount in sorted_amounts:
            added = False
            # Try to add to existing cluster
            for cluster in clusters:
                cluster_ref = cluster[0]
                # Check if within 5% of cluster reference
                if cluster_ref > 0:
                    pct_diff = abs(amount - cluster_ref) / cluster_ref
                    if pct_diff <= 0.05:
                        cluster.append(amount)
                        added = True
                        break

            if not added:
                # Start a new cluster
                clusters.append([amount])

        # For each qualifying cluster (entries from 2+ different months)
        for cluster in clusters:
            # Need to determine which months this cluster corresponds to
            cluster_transactions = []
            for txn in transactions:
                if txn.debit and float(txn.debit) in cluster:
                    merchant_match = (txn.merchant or "").lower().strip() == merchant_key
                    if merchant_match:
                        cluster_transactions.append(txn)

            if cluster_transactions:
                cluster_months = set()
                for txn in cluster_transactions:
                    stmt = db.query(Statement).filter(Statement.id == txn.statement_id).first()
                    if stmt:
                        month_label = f"{calendar.month_abbr[stmt.month]} {stmt.year}"
                        cluster_months.add(month_label)

                # Only recurre if appears in 2+ different months
                if len(cluster_months) >= 2:
                    avg_amount = sum(cluster) / len(cluster)
                    recurring.append({
                        "merchant": data["merchant_name"],
                        "amount": round(avg_amount, 2),
                        "months": sorted(list(cluster_months)),
                        "count": len(cluster_months),
                        "type": "subscription" if avg_amount < 2000 else "emi",
                    })

    # Remove duplicates (same merchant) and keep the one with most months
    seen = {}
    for r in recurring:
        key = r["merchant"].lower()
        if key not in seen or r["count"] > seen[key]["count"]:
            seen[key] = r

    result = list(seen.values())
    # Sort by count descending, then amount descending
    result.sort(key=lambda x: (-x["count"], -x["amount"]))
    return result
