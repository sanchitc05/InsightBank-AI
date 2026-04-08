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
    
    if db.query(Category).count() == 0:
        default_categories = [
            {"name": "Food & Dining", "keywords": ["restaurant", "swiggy", "zomato", "cafe", "baker", "food", "dining"], "color": "#FF6B6B", "icon": "utensils"},
            {"name": "Shopping", "keywords": ["amazon", "flipkart", "myntra", "mart", "retail", "store"], "color": "#4ECDC4", "icon": "shopping-bag"},
            {"name": "Transportation", "keywords": ["uber", "ola", "metro", "irctc", "fuel", "petrol", "parking"], "color": "#45B7D1", "icon": "car"},
            {"name": "Bills & Utilities", "keywords": ["electricity", "water", "gas", "recharge", "airtel", "jio", "broadband", "bescom"], "color": "#FDCB6E", "icon": "file-invoice-dollar"},
            {"name": "Entertainment", "keywords": ["netflix", "prime", "hotstar", "spotify", "bookmyshow", "cinema", "movie"], "color": "#A55EEA", "icon": "film"},
            {"name": "Health & Fitness", "keywords": ["pharmacy", "hospital", "clinic", "gym", "cult", "health", "medicine", "apollo"], "color": "#FF9FF3", "icon": "heartbeat"},
            {"name": "Travel", "keywords": ["makemytrip", "flight", "hotel", "indigo", "yatra", "airbnb"], "color": "#00D2D3", "icon": "plane"},
            {"name": "Investments", "keywords": ["zerodha", "groww", "upstox", "mutual fund", "sip", "stocks", "investment"], "color": "#27AE60", "icon": "chart-line"},
            {"name": "Income", "keywords": ["salary", "interest", "dividend", "cred", "cashback", "refund", "upi/cr"], "color": "#2ECC71", "icon": "arrow-down"},
            {"name": "Uncategorized", "keywords": [], "color": "#95A5A6", "icon": "question"}
        ]
        
        for cat_data in default_categories:
            db.add(Category(**cat_data))
        
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error seeding categories: {e}")
