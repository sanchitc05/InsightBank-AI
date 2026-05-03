import pytest
import os
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite://"
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db, engine
# Import all models to ensure they are registered with Base.metadata
from app.models.user import User
from app.models.statement import Statement
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.insight import Insight
from app.models.security import RevokedToken

# Use the app's explicit in-memory SQLite test engine for fast, isolated tests.
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once for the whole test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture()
def db_session():
    """Provides a fresh database session for each test, rolling back any changes."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture()
def client(db_session):
    """Provides a TestClient with the database session overridden."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
