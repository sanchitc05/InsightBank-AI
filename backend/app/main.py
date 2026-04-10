import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import statements, transactions, insights
from app.database import engine, Base, SessionLocal, seed_categories
from app.api_version import API_V1_PREFIX

load_dotenv()

# Create upload directory if it doesn't exist
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create all tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Bank Statement Analyzer API",
    description="API for parsing bank statements, managing transactions, and generating financial insights.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — single versioned prefix from api_version.py
app.include_router(statements.router, prefix=API_V1_PREFIX, tags=["Statements"])
app.include_router(transactions.router, prefix=API_V1_PREFIX, tags=["Transactions"])
app.include_router(insights.router, prefix=API_V1_PREFIX, tags=["Analytics & Insights"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Bank Statement Analyzer API is running"}
