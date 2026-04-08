import pandas as pd
import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)


class InsightsEngine:
    """Generates actionable financial insights from transaction data."""

    def __init__(self, df: pd.DataFrame, statement_id: int):
        self.df = df
        self.statement_id = statement_id

    def detect_anomalies(self) -> List[dict]:
        """Flag transactions that are unusually large (> mean + 2.5 * std)."""
        insights = []
        try:
            debits = self.df[self.df["debit"] > 0]["debit"]

            if debits.empty:
                return insights

            mean = debits.mean()
            std = debits.std()

            # If std is 0 or NaN, return empty list
            if pd.isna(std) or std == 0:
                return insights

            threshold = mean + 2.5 * std
            anomalies = self.df[self.df["debit"] > threshold]

            for _, row in anomalies.iterrows():
                # Format date as DD MMM YYYY
                date_str = "N/A"
                if pd.notna(row.get("txn_date")):
                    try:
                        date_obj = pd.to_datetime(row["txn_date"])
                        date_str = date_obj.strftime("%d %b %Y")
                    except:
                        date_str = "N/A"

                # Use merchant if available and non-empty, else use first 40 chars of description
                merchant = row.get("merchant") or ""
                if not merchant or merchant == "None":
                    desc = row.get("description", "")
                    merchant = desc[:40] if desc else "Unknown"

                insights.append({
                    "type": "anomaly",
                    "severity": "alert",
                    "title": "Unusual Transaction Detected",
                    "body": f"₹{row['debit']:,.2f} paid to {merchant} on {date_str} is significantly higher than your average spend of ₹{mean:,.2f}.",
                })

            return insights
        except Exception as e:
            logger.error(f"Error in detect_anomalies: {e}")
            return insights

    def top_merchants(self, n: int = 5) -> List[dict]:
        """Identify top spending merchants."""
        insights = []
        try:
            merchant_df = self.df[self.df["debit"] > 0].copy()

            if merchant_df.empty:
                return insights

            # Filter out null, empty, and "Unknown" merchants
            merchant_df = merchant_df[
                (merchant_df["merchant"].notna()) &
                (merchant_df["merchant"] != "") &
                (merchant_df["merchant"] != "None") &
                (merchant_df["merchant"] != "Unknown")
            ]

            if merchant_df.empty:
                return insights

            grouped = merchant_df.groupby("merchant").agg(
                total=("debit", "sum"),
                count=("debit", "count"),
            ).sort_values("total", ascending=False).head(n)

            for merchant, data in grouped.iterrows():
                insights.append({
                    "type": "pattern",
                    "severity": "info",
                    "title": f"Top Merchant: {merchant}",
                    "body": f"You spent ₹{data['total']:,.2f} across {int(data['count'])} transaction(s) at {merchant} this month.",
                })

            return insights
        except Exception as e:
            logger.error(f"Error in top_merchants: {e}")
            return insights

    def savings_rate_insight(self) -> List[dict]:
        """Evaluate savings rate and provide advice."""
        insights = []
        try:
            total_credit = self.df["credit"].sum()
            total_debit = self.df["debit"].sum()

            if total_credit == 0:
                return insights

            savings_rate = (total_credit - total_debit) / total_credit * 100

            if savings_rate > 20:
                severity = "info"
                title = "Excellent Savings Rate"
                body = f"You saved {savings_rate:.1f}% of your income this month. Keep it up!"
            elif savings_rate >= 10:
                severity = "info"
                title = "Moderate Savings Rate"
                body = f"You saved {savings_rate:.1f}% of your income this month. Consider pushing toward 20%."
            else:
                severity = "warn"
                title = "Low Savings Rate"
                body = f"Your savings rate is only {savings_rate:.1f}% this month. Review your top spending categories to find cuts."

            insights.append({
                "type": "tip",
                "severity": severity,
                "title": title,
                "body": body,
            })

            return insights
        except Exception as e:
            logger.error(f"Error in savings_rate_insight: {e}")
            return insights

    def category_budget_warning(self) -> List[dict]:
        """Warn if any single category exceeds 30% of total spending."""
        insights = []
        try:
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
                        "severity": "warn",
                        "title": f"{cat} is {pct:.0f}% of your budget",
                        "body": f"{cat} spending took up {pct:.0f}% of your total expenses this month. Consider setting a monthly limit.",
                    })

            return insights
        except Exception as e:
            logger.error(f"Error in category_budget_warning: {e}")
            return insights

    def peak_spend_day(self) -> List[dict]:
        """Find the day of week with highest average spending."""
        insights = []
        try:
            if "txn_date" not in self.df.columns:
                return insights

            df = self.df[self.df["debit"] > 0].copy()
            if df.empty:
                return insights

            df["txn_date"] = pd.to_datetime(df["txn_date"], errors="coerce")
            df = df.dropna(subset=["txn_date"])

            if df.empty:
                return insights

            # Use numeric day of week: 0=Monday, 6=Sunday
            df["weekday"] = df["txn_date"].dt.dayofweek
            daily_avg = df.groupby("weekday")["debit"].mean()

            if daily_avg.empty:
                return insights

            peak_weekday = daily_avg.idxmax()
            peak_avg = daily_avg.max()

            # Map weekday number to name
            weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            weekday_name = weekday_names[peak_weekday]

            insights.append({
                "type": "pattern",
                "severity": "info",
                "title": "Peak Spending Day",
                "body": f"You tend to spend the most on {weekday_name}s, averaging ₹{peak_avg:,.2f} per transaction.",
            })

            return insights
        except Exception as e:
            logger.error(f"Error in peak_spend_day: {e}")
            return insights

    def generate_all(self) -> List[dict]:
        """Generate all insights, wrapping each method in try/except."""
        all_insights = []

        try:
            all_insights.extend(self.detect_anomalies())
        except Exception as e:
            logger.error(f"detect_anomalies failed: {e}")

        try:
            all_insights.extend(self.top_merchants())
        except Exception as e:
            logger.error(f"top_merchants failed: {e}")

        try:
            all_insights.extend(self.savings_rate_insight())
        except Exception as e:
            logger.error(f"savings_rate_insight failed: {e}")

        try:
            all_insights.extend(self.category_budget_warning())
        except Exception as e:
            logger.error(f"category_budget_warning failed: {e}")

        try:
            all_insights.extend(self.peak_spend_day())
        except Exception as e:
            logger.error(f"peak_spend_day failed: {e}")

        return all_insights
