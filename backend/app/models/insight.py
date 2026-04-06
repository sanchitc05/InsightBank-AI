from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    statement_id = Column(Integer, ForeignKey("statements.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum("anomaly", "pattern", "tip", name="insight_type"), nullable=False)
    title = Column(String(120), nullable=False)
    body = Column(Text, nullable=True)
    severity = Column(Enum("info", "warn", "alert", name="insight_severity"), default="info")
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    statement = relationship("Statement", back_populates="insights")

    def __repr__(self):
        return f"<Insight [{self.severity}] {self.title[:40]}>"
