from sqlalchemy import Column, Integer, String, DateTime, Index
from sqlalchemy.sql import func

from app.database import Base

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    jti = Column(String(255), unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<RevokedToken {self.jti}>"
