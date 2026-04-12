from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import re


# ── Auth Schemas ──────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters long")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Statement Schemas ──────────────────────────────────────

class StatementBase(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    month: int
    year: int
    total_credit: float = Field(0.0, ge=0)
    total_debit: float = Field(0.0, ge=0)


class StatementResponse(StatementBase):
    id: int
    file_name: str
    uploaded_at: Optional[datetime] = None
    status: str = "SUCCESS"
    error_log: Optional[str] = None

    @field_validator("account_number")
    @classmethod
    def mask_account_number(cls, v):
        if not v:
            return v
        # Ensure it's masked to XXXX1234
        if len(v) > 4:
            return "X" * (len(v) - 4) + v[-4:]
        return "XXXX" + v

    model_config = ConfigDict(from_attributes=True)


class StatementUploadResponse(BaseModel):
    statement_id: int
    bank_name: Optional[str] = "GENERIC"
    month: Optional[int] = None
    year: Optional[int] = None
    total_transactions: int = 0
    total_credit: float = Field(default=0.0, ge=0)
    total_debit: float = Field(default=0.0, ge=0)
    status: str = "PENDING"


# ── Transaction Schemas ────────────────────────────────────

class TransactionBase(BaseModel):
    txn_date: Optional[date] = None
    description: Optional[str] = None
    debit: float = Field(0.0, ge=0)
    credit: float = Field(0.0, ge=0)
    balance: float = 0.0
    category: str = "Uncategorized"
    merchant: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: int
    statement_id: int

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[TransactionResponse]


# ── Category Schemas ───────────────────────────────────────

class CategoryResponse(BaseModel):
    id: int
    name: str
    keywords: Optional[list] = None
    color: Optional[str] = None
    icon: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Insight Schemas ────────────────────────────────────────

class InsightBase(BaseModel):
    type: str
    title: str
    body: Optional[str] = None
    severity: str = "info"


class InsightResponse(InsightBase):
    id: int
    statement_id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InsightGenerateResponse(BaseModel):
    statement_id: int
    generated: int
    insights: List[InsightResponse]


# ── Analytics Schemas ──────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_income: float
    total_expense: float
    savings: float
    savings_rate: float
    top_category: str
    daily_avg_spend: float
    transaction_count: int
    opening_balance: float
    closing_balance: float


class CategoryBreakdown(BaseModel):
    category: str
    total: float
    count: int
    percentage: float
    color: Optional[str] = None
    icon: Optional[str] = None


class TrendPoint(BaseModel):
    month: int
    year: int
    label: str
    total_income: float
    total_expense: float
    savings: float


class CompareResponse(BaseModel):
    statements: List[StatementResponse]
    summary: List[AnalyticsSummary]
    categories: List[List[CategoryBreakdown]]


# ── Error Schemas ──────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str


class ParserErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = "PARSER_ERROR"
    bank_name: Optional[str] = None
