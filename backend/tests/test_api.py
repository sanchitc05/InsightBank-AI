import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
import os

# Setup test database (SQLite in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_bank.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("./test_bank.db"):
        try:
            os.remove("./test_bank.db")
        except PermissionError:
            pass # On Windows, file might stay locked for a bit

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_get_statements_empty():
    response = client.get("/api/v1/statements")
    assert response.status_code == 200
    assert response.json() == []

def test_upload_invalid_file_type():
    files = {"file": ("test.txt", b"not a pdf", "text/plain")}
    response = client.post("/api/v1/statements/upload", files=files)
    assert response.status_code == 400
    assert "Only PDF files are accepted" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_transactions_no_data():
    response = client.get("/api/v1/transactions")
    assert response.status_code == 200
    assert response.json()["data"] == []

def test_upload_parsing_failure():
    # Provide a PDF that is actually just garbage content to trigger a parsing error (fake bank detection fail)
    files = {"file": ("empty.pdf", b"%PDF-1.4\n1 0 obj\n<<\n/Title (Test)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF", "application/pdf")}
    response = client.post("/api/v1/statements/upload", files=files)
    
