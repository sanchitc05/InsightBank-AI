import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bank_analyzer.db")

# SQLite needs connect_args={"check_same_thread": False} to be used across threads in FastAPI
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_categories(db: Session):
    """Seed initial categories if the table is empty."""
    from app.models.category import Category
    
    if db.query(Category).count() > 0:
        return
    categories = [
        {"name": "Food", "keywords": ["swiggy","zomato","restaurant","cafe","food","hotel","eat"], "color": "#f97316", "icon": "🍔"},
        {"name": "Rent", "keywords": ["rent","house","landlord","pg","accommodation"], "color": "#8b5cf6", "icon": "🏠"},
        {"name": "Utilities", "keywords": ["electricity","water","gas","internet","broadband","bill"], "color": "#06b6d4", "icon": "⚡"},
        {"name": "Shopping", "keywords": ["amazon","flipkart","myntra","mall","store","shop","purchase"], "color": "#ec4899", "icon": "🛍️"},
        {"name": "EMI", "keywords": ["emi","loan","equated","installment","repayment"], "color": "#ef4444", "icon": "💳"},
        {"name": "Salary", "keywords": ["salary","stipend","payroll","income","credited by"], "color": "#10b981", "icon": "💰"},
        {"name": "Transport", "keywords": ["uber","ola","rapido","metro","bus","petrol","fuel","cab"], "color": "#f59e0b", "icon": "🚗"},
        {"name": "Entertainment", "keywords": ["netflix","spotify","prime","hotstar","youtube","movie"], "color": "#a855f7", "icon": "🎬"},
        {"name": "Healthcare", "keywords": ["pharmacy","hospital","clinic","doctor","medicine","health"], "color": "#14b8a6", "icon": "🏥"},
        {"name": "Education", "keywords": ["udemy","coursera","college","fees","tuition","book"], "color": "#3b82f6", "icon": "📚"},
    ]
    for cat in categories:
        db.add(Category(
            name=cat["name"],
            keywords=cat["keywords"],
            color=cat["color"],
            icon=cat["icon"]
        ))
    db.commit()
