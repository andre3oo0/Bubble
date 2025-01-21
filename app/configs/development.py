class DevelopmentConfig:
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///development.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "your_secret_key"
