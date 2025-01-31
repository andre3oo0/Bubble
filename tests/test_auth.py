import pytest

def test_login(client):
    """Test login endpoint"""
    response = client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert response.status_code == 200
    assert "message" in response.json
