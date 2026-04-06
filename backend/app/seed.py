"""
Seed script to populate the default categories into the database.
Run once after creating the database schema:
    python -m app.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.category import Category


DEFAULT_CATEGORIES = [
    {
        "name": "Food",
        "keywords": ["swiggy", "zomato", "food", "restaurant", "cafe", "dominos", "pizza", "mcdonalds", "kfc", "burger", "biryani", "hotel", "dining", "eatery", "bakery", "starbucks", "chai", "tea"],
        "color": "#FF6B6B",
        "icon": "🍕",
    },
    {
        "name": "Rent",
        "keywords": ["rent", "house rent", "room rent", "flat rent", "pg rent", "hostel", "accommodation"],
        "color": "#4ECDC4",
        "icon": "🏠",
    },
    {
        "name": "Utilities",
        "keywords": ["electricity", "water", "gas", "broadband", "internet", "wifi", "airtel", "jio", "vi", "bsnl", "mobile recharge", "dth", "tata sky", "dish tv", "bill payment"],
        "color": "#45B7D1",
        "icon": "💡",
    },
    {
        "name": "Shopping",
        "keywords": ["amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa", "bigbasket", "dmart", "reliance", "shopping", "purchase", "store", "mart", "supermarket", "zepto", "blinkit", "instamart"],
        "color": "#96CEB4",
        "icon": "🛒",
    },
    {
        "name": "EMI",
        "keywords": ["emi", "loan", "equated monthly", "bajaj", "hdfc loan", "sbi loan", "lic", "insurance premium", "mutual fund", "sip", "investment"],
        "color": "#DDA0DD",
        "icon": "💳",
    },
    {
        "name": "Salary",
        "keywords": ["salary", "payroll", "stipend", "wages", "income", "credited by", "neft cr"],
        "color": "#98D8C8",
        "icon": "💰",
    },
    {
        "name": "Transport",
        "keywords": ["uber", "ola", "rapido", "metro", "bus", "train", "irctc", "petrol", "diesel", "fuel", "hp petrol", "indian oil", "bharat petroleum", "parking", "toll", "fastag"],
        "color": "#F7DC6F",
        "icon": "🚗",
    },
    {
        "name": "Entertainment",
        "keywords": ["netflix", "hotstar", "prime video", "spotify", "youtube", "movie", "pvr", "inox", "cinema", "gaming", "playstation", "xbox", "apple music", "gaana"],
        "color": "#BB8FCE",
        "icon": "🎬",
    },
    {
        "name": "Healthcare",
        "keywords": ["hospital", "doctor", "pharmacy", "medical", "medicine", "apollo", "medplus", "pharmeasy", "1mg", "netmeds", "clinic", "dental", "pathology", "lab test", "healthian"],
        "color": "#82E0AA",
        "icon": "🏥",
    },
    {
        "name": "Education",
        "keywords": ["school", "college", "university", "tuition", "course", "udemy", "coursera", "unacademy", "byju", "education", "exam", "fees", "book", "stationery"],
        "color": "#85C1E9",
        "icon": "📚",
    },
    {
        "name": "Transfer",
        "keywords": ["transfer", "self transfer", "own account", "fund transfer"],
        "color": "#AEB6BF",
        "icon": "🔄",
    },
    {
        "name": "ATM",
        "keywords": ["atm", "cash withdrawal", "atm withdrawal", "cash deposit"],
        "color": "#F5B041",
        "icon": "🏧",
    },
]


def seed_categories():
    """Insert default categories if they don't exist."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = {c.name for c in db.query(Category).all()}
        added = 0
        for cat_data in DEFAULT_CATEGORIES:
            if cat_data["name"] not in existing:
                cat = Category(**cat_data)
                db.add(cat)
                added += 1
        db.commit()
        print(f"✅ Seeded {added} categories ({len(existing)} already existed)")
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()
