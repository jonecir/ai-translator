from flask import Flask
from flask_cors import CORS
from .config import settings
from .database import Base, engine
from .routes.jobs import bp as jobs_bp
from .routes.glossaries import bp as glossaries_bp
from .auth import bp as auth_bp




def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.SECRET_KEY


    CORS(app, resources={r"/*": {"origins": settings.CORS_ORIGINS.split(",")}})


    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(glossaries_bp, url_prefix="/api")
    app.register_blueprint(jobs_bp, url_prefix="/api")


    # Ensure metadata (alembic handles migrations, but create if empty)
    Base.metadata.create_all(bind=engine)


    return app