# backend/app/__init__.py
from __future__ import annotations

import os
from pathlib import Path
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
from flask_babel import Babel  # Flask-Babel 4.x

from .extensions import db

babel = Babel()  # instância global do Babel


def _parse_origins(v: str | None) -> list[str]:
    return [x.strip() for x in (v or "").split(",") if x.strip()]


# ---- i18n / locale ----
SUPPORTED_LOCALES: tuple[str, ...] = ("pt", "en", "es", "it")


def select_locale() -> str:
    """
    Ordem de seleção do locale:
      1) querystring ?lang=xx[,yy]
      2) Header Accept-Language
      3) fallback 'pt'
    """
    lang = (request.args.get("lang") or "").split(",")[0].strip().lower()
    if lang in SUPPORTED_LOCALES:
        return lang
    return request.accept_languages.best_match(SUPPORTED_LOCALES) or "pt"


def create_app():
    # 1) .env
    backend_env = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(backend_env, override=False)
    load_dotenv(find_dotenv(), override=False)

    app = Flask(__name__)

    # 2) DB
    db_uri = os.getenv("DATABASE_URL", "").strip()
    if not db_uri:
        raise RuntimeError(
            "DATABASE_URL não definido no .env "
            "(ex: postgresql+psycopg2://user:pass@localhost:5432/ai_translator)"
        )
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT/segurança
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["ACCESS_TOKEN_EXPIRES_MIN"] = int(os.getenv("ACCESS_TOKEN_EXPIRES_MIN", "120"))

    # 3) i18n (Babel 4.x)
    app.config.setdefault("BABEL_DEFAULT_LOCALE", "pt")
    app.config.setdefault("BABEL_DEFAULT_TIMEZONE", "UTC")
    app.config["BABEL_SUPPORTED_LOCALES"] = list(SUPPORTED_LOCALES)

    # 4) Extensões
    db.init_app(app)
    # Babel 4.x: registra com locale_selector (não existe mais @babel.localeselector)
    babel.init_app(app, locale_selector=select_locale)

    # 5) CORS
    origins = _parse_origins(os.getenv("CORS_ORIGINS")) or ["http://localhost:5173"]
    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        expose_headers=["Content-Type", "Authorization"],
    )

    # 6) Blueprints
    from app.auth import bp as auth_bp
    from app.routes.jobs import bp as jobs_bp
    from app.routes.glossaries import bp as glossaries_bp
    from app.routes.me import bp as me_bp
    from app.routes.passwords import bp as passwords_bp

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(glossaries_bp, url_prefix="/api")
    app.register_blueprint(me_bp, url_prefix="/api")
    app.register_blueprint(passwords_bp, url_prefix="/api")

    return app
