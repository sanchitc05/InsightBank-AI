import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.routers import statements, transactions, insights, auth
from app.database import engine, Base, SessionLocal, seed_categories
from app.api_version import API_V1_PREFIX
from app.exceptions import StatementParsingException

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(StatementParsingException)
async def statement_parsing_exception_handler(request, exc: StatementParsingException):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.detail,
            "parser": exc.parser,
            "line": exc.line,
            "context": exc.context,
        },
    )

# CORS configuration
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# Include routers — single versioned prefix from api_version.py
app.include_router(auth.router, prefix=API_V1_PREFIX + "/auth", tags=["Auth"])
app.include_router(statements.router, prefix=API_V1_PREFIX, tags=["Statements"])
app.include_router(transactions.router, prefix=API_V1_PREFIX, tags=["Transactions"])
app.include_router(insights.router, prefix=API_V1_PREFIX, tags=["Analytics & Insights"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Bank Statement Analyzer API is running"}
