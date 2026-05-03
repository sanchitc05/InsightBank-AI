from sqlalchemy import CheckConstraint, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    statement_id = Column(Integer, ForeignKey("statements.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)
    title = Column(String(120), nullable=False)
    body = Column(Text, nullable=True)
    severity = Column(String(20), default="info", nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    statement = relationship("Statement", back_populates="insights")

    __table_args__ = (
        CheckConstraint("type IN ('anomaly', 'pattern', 'tip')", name="ck_insights_type"),
        CheckConstraint("severity IN ('info', 'warn', 'alert')", name="ck_insights_severity"),
    )

    def __repr__(self):
        return f"<Insight [{self.severity}] {self.title[:40]}>"
