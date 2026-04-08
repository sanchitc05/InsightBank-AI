from sqlalchemy import Column, Integer, String, Date, Text, Numeric, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    statement_id = Column(Integer, ForeignKey("statements.id", ondelete="CASCADE"), nullable=False)
    txn_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    debit = Column(Numeric(precision=12, scale=2), default=0.00)
    credit = Column(Numeric(precision=12, scale=2), default=0.00)
    balance = Column(Numeric(precision=14, scale=2), default=0.00)
    category = Column(String(50), default="Uncategorized")
    merchant = Column(String(100), nullable=True)

    # Relationships
    statement = relationship("Statement", back_populates="transactions")

    __table_args__ = (
        Index("idx_txn_date", "txn_date"),
        Index("idx_category", "category"),
        Index("idx_statement_id", "statement_id"),
    )

    def __repr__(self):
        return f"<Transaction {self.txn_date} {self.description[:30] if self.description else ''}>"
