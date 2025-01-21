class TestingConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///testing.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "your_test_secret_key"