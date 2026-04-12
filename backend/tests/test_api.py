import pytest

def login_test_user(client):
    # Register and login a fresh test user
    client.post("/api/v1/auth/register", json={
        "email": "functional_test@example.com",
        "password": "Password123!@#"
    })
    client.post("/api/v1/auth/login", json={
        "email": "functional_test@example.com",
        "password": "Password123!@#"
    })

def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_get_statements_empty(client):
    login_test_user(client)
    response = client.get("/api/v1/statements")
    assert response.status_code == 200
    assert response.json() == []

def test_upload_invalid_file_type(client):
    login_test_user(client)
    files = {"file": ("test.txt", b"not a pdf", "text/plain")}
    response = client.post("/api/v1/statements/upload", files=files)
    assert response.status_code == 400
    assert "Only PDF files are accepted" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_transactions_no_data(client):
    login_test_user(client)
    response = client.get("/api/v1/transactions")
    assert response.status_code == 200
    assert response.json()["data"] == []

def test_upload_parsing_failure(client):
    login_test_user(client)
    # Provide a PDF that is actually just garbage content to trigger a parsing error (fake bank detection fail)
    files = {"file": ("empty.pdf", b"%PDF-1.4\n1 0 obj\n<<\n/Title (Test)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF", "application/pdf")}
    response = client.post("/api/v1/statements/upload", files=files)
    
    # It should fail with 422 because it cannot detect a bank or find transactions
    assert response.status_code == 422
    assert "detail" in response.json()
    assert "parser" in response.json()
