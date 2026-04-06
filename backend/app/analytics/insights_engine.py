import pandas as pd
import numpy as np
from typing import List


class InsightsEngine:
    """Generates actionable financial insights from transaction data."""

    def __init__(self, df: pd.DataFrame, statement_id: int):
        self.df = df
        self.statement_id = statement_id

    def detect_anomalies(self) -> List[dict]:
        """Flag transactions that are unusually large (> mean + 2.5 * std)."""
        insights = []
        debits = self.df[self.df["debit"] > 0]["debit"]

        if debits.empty or len(debits) < 3:
            return insights

        mean = debits.mean()
        std = debits.std()
        threshold = mean + 2.5 * std

        anomalies = self.df[self.df["debit"] > threshold]
        for _, row in anomalies.iterrows():
            insights.append({
                "type": "anomaly",
                "title": "Unusual Transaction Detected",
                "body": f"₹{row['debit']:,.2f} paid to {row.get('merchant', 'Unknown')} "
                        f"on {row.get('txn_date', 'N/A')} is significantly higher than "
                        f"your average spend of ₹{mean:,.2f}.",
                "severity": "alert",
            })

        return insights

    def top_merchants(self, n: int = 5) -> List[dict]:
        """Identify top spending merchants."""
        insights = []
        merchant_df = self.df[self.df["debit"] > 0].copy()

        if merchant_df.empty:
            return insights

        grouped = merchant_df.groupby("merchant").agg(
            total=("debit", "sum"),
            count=("debit", "count"),
        ).sort_values("total", ascending=False).head(n)

        for merchant, data in grouped.iterrows():
            if merchant and merchant != "None":
                insights.append({
                    "type": "pattern",
                    "title": f"Top Merchant: {merchant}",
                    "body": f"You spent ₹{data['total']:,.2f} across {int(data['count'])} "
                            f"transactions at {merchant} this month.",
                    "severity": "info",
                })

        return insights

    def savings_rate_insight(self) -> List[dict]:
        """Evaluate savings rate and provide advice."""
        insights = []
        total_credit = self.df["credit"].sum()
        total_debit = self.df["debit"].sum()

        if total_credit == 0:
            return insights

        rate = (total_credit - total_debit) / total_credit * 100

        if rate > 20:
            insights.append({
                "type": "tip",
                "title": "Excellent Savings Rate!",
                "body": f"Great job! Your savings rate of {rate:.1f}% is well above the "
                        f"recommended 20%. Keep up the good financial discipline.",
                "severity": "info",
            })
        elif rate >= 10:
            insights.append({
                "type": "tip",
                "title": "Moderate Savings Rate",
                "body": f"Your savings rate is {rate:.1f}%. Consider increasing it to 20%+ "
                        f"by cutting back on non-essential spending.",
                "severity": "info",
            })
        else:
            insights.append({
                "type": "tip",
                "title": "Low Savings Rate Alert",
                "body": f"Your savings rate is low at {rate:.1f}%. Consider reducing "
                        f"discretionary spending to build a stronger financial cushion.",
                "severity": "warn",
            })

        return insights

    def category_budget_warning(self) -> List[dict]:
        """Warn if any single category exceeds 30% of total spending."""
        insights = []
        debits = self.df[self.df["debit"] > 0]

        if debits.empty:
            return insights

        total_debit = debits["debit"].sum()
        if total_debit == 0:
            return insights

        cat_totals = debits.groupby("category")["debit"].sum()

        for cat, amount in cat_totals.items():
            pct = amount / total_debit * 100
            if pct > 30 and cat != "Uncategorized":
                insights.append({
                    "type": "tip",
                    "title": f"{cat} is {pct:.0f}% of Your Budget",
                    "body": f"You spent ₹{amount:,.2f} on {cat}, which is {pct:.0f}% of "
                            f"your total spending. Consider setting a monthly limit.",
                    "severity": "warn",
                })

        return insights

    def peak_spend_day(self) -> List[dict]:
        """Find the day of week with highest average spending."""
        insights = []

        if "txn_date" not in self.df.columns:
            return insights

        df = self.df[self.df["debit"] > 0].copy()
        if df.empty:
            return insights

        df["txn_date"] = pd.to_datetime(df["txn_date"], errors="coerce")
        df = df.dropna(subset=["txn_date"])

        if df.empty:
            return insights

        df["day_of_week"] = df["txn_date"].dt.day_name()
        daily_avg = df.groupby("day_of_week")["debit"].mean()

        if daily_avg.empty:
            return insights

        peak_day = daily_avg.idxmax()
        peak_avg = daily_avg.max()

        insights.append({
            "type": "pattern",
            "title": f"Peak Spending Day: {peak_day}",
            "body": f"You spend the most on {peak_day}s, averaging ₹{peak_avg:,.0f} per day. "
                    f"Plan your budget accordingly.",
            "severity": "info",
        })

        return insights

    def generate_all(self) -> List[dict]:
        """Generate all insights."""
        all_insights = []
        all_insights.extend(self.detect_anomalies())
        all_insights.extend(self.top_merchants())
        all_insights.extend(self.savings_rate_insight())
        all_insights.extend(self.category_budget_warning())
        all_insights.extend(self.peak_spend_day())
        return all_insights
