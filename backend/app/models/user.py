from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    currency = Column(String(10), default="INR")
    profile_image_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    statements = relationship("Statement", backref="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
