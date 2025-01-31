import pytest
from app import create_app, db

@pytest.fixture
def app():
    """Create and configure a new app instance for testing."""
    app = create_app("testing")  # Ensure "testing" is a valid config
    app.config["TESTING"] = True

    with app.app_context():
        db.create_all()  # Create tables for test database
        yield app  # Yield the app instance for tests
        db.session.remove()
        db.drop_all()  # Cleanup after tests

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
