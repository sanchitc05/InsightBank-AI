from sqlalchemy import Column, Integer, String, JSON

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    keywords = Column(JSON, nullable=True)
    color = Column(String(10), nullable=True)
    icon = Column(String(10), nullable=True)

    def __repr__(self):
        return f"<Category {self.name}>"
