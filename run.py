import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Extensions
cors = CORS()
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name=None):
    app = Flask(__name__)

    # Load configuration
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(f"app.configs.{config_name.capitalize()}Config")

    # Initialize extensions
    cors.init_app(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.interactions import interactions_bp
    from app.routes.reminders import reminders_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(interactions_bp, url_prefix="/interactions")
    app.register_blueprint(reminders_bp, url_prefix="/reminders")

    return app

# Entry point
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)