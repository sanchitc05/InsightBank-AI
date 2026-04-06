import re
from typing import Optional
from sqlalchemy.orm import Session

from app.models.category import Category


class Categorizer:
    """Auto-categorizes transactions based on keyword matching."""

    def __init__(self, db: Session):
        self.categories = {}
        cats = db.query(Category).all()
        for cat in cats:
            keywords = cat.keywords if isinstance(cat.keywords, list) else []
            self.categories[cat.name] = keywords

    def categorize(self, description: str) -> str:
        """Match description against category keywords."""
        if not description:
            return "Uncategorized"

        desc_lower = description.lower()

        for category_name, keywords in self.categories.items():
            for keyword in keywords:
                if keyword.lower() in desc_lower:
                    return category_name

        return "Uncategorized"

    @staticmethod
    def extract_merchant(description: str) -> Optional[str]:
        """Clean description to extract meaningful merchant name."""
        if not description:
            return None

        merchant = description

        # Remove common prefixes
        prefixes = [
            r'^UPI[-/]', r'^IMPS[-/]', r'^NEFT[-/]', r'^RTGS[-/]',
            r'^POS\s+', r'^ATM[-/\s]', r'^BIL[-/]', r'^ACH[-/]',
            r'^SI[-/]', r'^MMT[-/]',
        ]
        for prefix in prefixes:
            merchant = re.sub(prefix, '', merchant, flags=re.IGNORECASE)

        # Remove UPI IDs (user@bank patterns)
        merchant = re.sub(r'\S+@\S+', '', merchant)

        # Remove transaction ref numbers
        merchant = re.sub(r'\b\d{8,}\b', '', merchant)

        # Remove bank codes and ref patterns
        merchant = re.sub(r'\b[A-Z]{4}0\d{6}\b', '', merchant)  # IFSC codes
        merchant = re.sub(r'\b\d{6,}\b', '', merchant)  # Long number sequences

        # Remove Dr/Cr suffixes
        merchant = re.sub(r'\s*(Dr|Cr|DR|CR)\.?\s*$', '', merchant)

        # Remove trailing slashes, dashes, and extra whitespace
        merchant = re.sub(r'[/\\-]+$', '', merchant)
        merchant = re.sub(r'\s+', ' ', merchant).strip()

        # Title case and truncate
        if merchant:
            merchant = merchant.title()[:40]

        return merchant if merchant else None
