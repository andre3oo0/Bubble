import pytest
from unittest.mock import patch
from flask import jsonify

@pytest.fixture
def mock_openai():
    """Mock OpenAI API response to prevent real API calls."""
    with patch("app.services.nlp_service.generate_ai_response", return_value="Mock AI Response") as mock:
        yield mock

def test_ai_response(client, mock_openai):
    """Test AI interaction with mocked OpenAI API."""
    response = client.post("/interactions/process", json={"user_id": 1, "text": "I feel overwhelmed."})

    assert response.status_code == 200
    assert response.json["ai_response"] == "Mock AI Response"
