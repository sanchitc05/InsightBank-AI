import os
from contextlib import asynccontextmanager
import traceback
import logging
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
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
        # Seed categories
        seed_categories(db)
        
        # Cleanup orphaned states: Reset any statements still in PROCESSING to FAILED on startup
        from app.models.statement import Statement
        orphaned = db.query(Statement).filter(Statement.status == "PROCESSING").all()
        if orphaned:
            for stmt in orphaned:
                stmt.status = "FAILED"
                stmt.error_log = "Processing interrupted by server restart."
            db.commit()
            print(f"Cleanup: Reset {len(orphaned)} orphaned statements to FAILED.")
            
    finally:
        db.close()
    yield

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Bank Statement Analyzer API",
    description="API for parsing bank statements, managing transactions, and generating financial insights.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and log them with traceback."""
    error_msg = f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}"
    logger.error(error_msg)
    
    # Also log to a dedicated file for easy access
    with open("error_log.txt", "a") as f:
        f.write(f"\n{'='*50}\n")
        f.write(f"Timestamp: {datetime.now()}\n")
        f.write(f"Path: {request.url.path}\n")
        f.write(error_msg)
        
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Check server logs or error_log.txt for details."},
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
origins = list(set([
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://localhost:5174",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
