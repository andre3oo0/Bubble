import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

# Initialize extensions
cors = CORS()
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

from dotenv import load_dotenv
load_dotenv()


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
    from app.routes.safe_space import safe_space_bp
    from app.routes.journal import journal_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(interactions_bp, url_prefix="/interactions")
    app.register_blueprint(reminders_bp, url_prefix="/reminders")
    app.register_blueprint(safe_space_bp, url_prefix="/safe-space")
    app.register_blueprint(journal_bp, url_prefix="/journal")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()

