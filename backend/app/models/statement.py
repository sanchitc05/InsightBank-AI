from sqlalchemy import Column, Integer, String, DateTime, Numeric, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Statement(Base):
    __tablename__ = "statements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_name = Column(String(50), nullable=True)
    account_number = Column(String(30), nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    file_name = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    total_credit = Column(Numeric(precision=12, scale=2), default=0.00)
    total_debit = Column(Numeric(precision=12, scale=2), default=0.00)
    
    # Ingestion status tracking
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, PROCESSING, SUCCESS, FAILED
    error_log = Column(String(1024), nullable=True)

    # Relationships
    transactions = relationship("Transaction", back_populates="statement", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="statement", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("account_number", "month", "year", "user_id", name="uq_statement_period"),
    )

    def __repr__(self):
        return f"<Statement {self.bank_name} {self.month}/{self.year}>"
