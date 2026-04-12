import pytest

def test_user_registration(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Password123!@#"
    })
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_user_login(client):
    # Register first
    client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Password123!@#"
    })
    
    # Login using JSON
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "Password123!@#"
    })
    assert response.status_code == 200
    assert "access_token" in client.cookies
    assert "refresh_token" in client.cookies

def test_user_logout(client):
    # Register & Login
    client.post("/api/v1/auth/register", json={"email": "logout@example.com", "password": "Password123!@#"})
    client.post("/api/v1/auth/login", json={"email": "logout@example.com", "password": "Password123!@#"})
    
    # Logout
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert "access_token" not in client.cookies or client.cookies.get("access_token") == ""

def test_token_rotation(client):
    # Register & Login
    email = "rotate@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!@#"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!@#"})
    
    old_access_token = client.cookies.get("access_token")
    
    # Refresh
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    
    new_access_token = client.cookies.get("access_token")
    assert old_access_token != new_access_token

def test_access_protected_endpoint_after_login(client):
    # Register & Login
    email = "protected@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": "Password123!@#"})
    client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!@#"})
    
    # Access statements
    response = client.get("/api/v1/statements")
    assert response.status_code == 200
    assert response.json() == []
