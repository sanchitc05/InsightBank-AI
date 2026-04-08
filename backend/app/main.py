import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import statements, transactions, insights
from app.database import engine, Base

load_dotenv()

# Create upload directory if it doesn't exist
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Bank Statement Analyzer API",
    description="API for parsing bank statements, managing transactions, and generating financial insights.",
    version="1.0.0",
)

@app.on_event("startup")
def on_startup():
    from app.database import SessionLocal, seed_categories
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(statements.router, prefix="/api/v1", tags=["Statements"])
app.include_router(transactions.router, prefix="/api/v1", tags=["Transactions"])
app.include_router(insights.router, prefix="/api/v1", tags=["Analytics & Insights"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Bank Statement Analyzer API is running"}
