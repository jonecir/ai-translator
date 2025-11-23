# backend/app/auth.py
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import text
import bcrypt, jwt

from app.extensions import db  # << aqui!
from app.utils.auth_middleware import token_required

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or request.form or {}
    email = (data.get("email") or data.get("username") or "").strip().lower()
    password = (data.get("password") or "").encode("utf-8")
    if not email or not password:
        return jsonify({"error": "missing credentials"}), 400

    row = (
        db.session.execute(
            text(
                """
            SELECT id, name, email, password_hash, COALESCE(is_active, TRUE) AS is_active, avatar
            FROM users
            WHERE lower(email) = :email
            LIMIT 1
        """
            ),
            {"email": email},
        )
        .mappings()
        .first()
    )

    if not row or not row["is_active"]:
        return jsonify({"error": "invalid credentials"}), 401

    if not bcrypt.checkpw(password, row["password_hash"].encode("utf-8")):
        return jsonify({"error": "invalid credentials"}), 401

    exp_minutes = int(current_app.config.get("ACCESS_TOKEN_EXPIRES_MIN", 120))
    exp = datetime.utcnow() + timedelta(minutes=exp_minutes)
    token = jwt.encode(
        {"user_id": row["id"], "exp": exp}, current_app.config["JWT_SECRET_KEY"], algorithm="HS256"
    )
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    user = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "avatar": row.get("avatar"),
    }
    return jsonify({"token": token, "expires_at": exp.isoformat(), "user": user}), 200


@bp.route("/refresh", methods=["POST"])
@token_required
def refresh():
    exp_minutes = int(current_app.config.get("ACCESS_TOKEN_EXPIRES_MIN", 120))
    exp = datetime.utcnow() + timedelta(minutes=exp_minutes)
    token = jwt.encode(
        {"user_id": getattr(request, "user_id", None), "exp": exp},
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return jsonify({"token": token, "expires_at": exp.isoformat()}), 200
