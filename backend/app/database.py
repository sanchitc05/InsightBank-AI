import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker, declarative_base, Session


load_dotenv()

def build_database_url():
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    db_type = os.getenv("DB_TYPE", "postgresql").lower()
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME")

    if all([db_host, db_port, db_user, db_pass, db_name]):
        if db_type in {"postgres", "postgresql"}:
            return f"postgresql+psycopg://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
        raise RuntimeError(
            f"Unsupported DB_TYPE '{db_type}'. InsightBank-AI now supports PostgreSQL only."
        )

    raise RuntimeError(
        "Database configuration is missing. Set DATABASE_URL, or set DB_TYPE=postgresql "
        "with DB_HOST, DB_PORT, DB_USER, DB_PASS, and DB_NAME."
    )


def build_engine_kwargs(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if database_url in {"sqlite://", "sqlite:///:memory:"}:
            kwargs["poolclass"] = StaticPool
        return kwargs

    if database_url.startswith("mysql"):
        raise RuntimeError("MySQL URLs are no longer supported. Use PostgreSQL.")

    return {"pool_pre_ping": True}


DATABASE_URL = build_database_url()

engine = create_engine(DATABASE_URL, **build_engine_kwargs(DATABASE_URL))

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
