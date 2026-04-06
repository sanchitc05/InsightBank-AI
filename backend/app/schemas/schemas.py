from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# ── Statement Schemas ──────────────────────────────────────

class StatementBase(BaseModel):
    bank_name: str
    account_number: Optional[str] = None
    month: int
    year: int
    total_credit: float = 0.0
    total_debit: float = 0.0


class StatementResponse(StatementBase):
    id: int
    file_name: str
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StatementUploadResponse(BaseModel):
    statement_id: int
    bank_name: str
    month: int
    year: int
    total_transactions: int
    total_credit: float
    total_debit: float


# ── Transaction Schemas ────────────────────────────────────

class TransactionBase(BaseModel):
    txn_date: Optional[date] = None
    description: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0
    balance: float = 0.0
    category: str = "Uncategorized"
    merchant: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: int
    statement_id: int

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


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

    class Config:
        from_attributes = True


class InsightGenerateResponse(BaseModel):
    generated: int


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
