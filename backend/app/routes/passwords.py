from datetime import datetime, timedelta, timezone
from uuid import uuid4
from flask import Blueprint, request, jsonify
from sqlalchemy import text
import bcrypt

from app.extensions import db

bp = Blueprint("passwords", __name__)


@bp.post("/forgot")
def forgot():
    data = request.get_json(silent=True) or request.form or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"ok": True})  # não revela existência

    row = (
        db.session.execute(
            text("SELECT id FROM users WHERE lower(email)=:e LIMIT 1"),
            {"e": email},
        )
        .mappings()
        .first()
    )
    if not row:
        return jsonify({"ok": True})

    token = str(uuid4())
    exp = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.session.execute(
        text(
            """
            INSERT INTO password_resets (user_id, token, expires_at)
            VALUES (:uid, :token, :exp)
        """
        ),
        {"uid": row["id"], "token": token, "exp": exp},
    )
    db.session.commit()

    # Em produção: enviar e-mail. Em dev: printar no log.
    print(f"[RESET] http://localhost:5173/reset?token={token}")
    return jsonify({"ok": True})


@bp.post("/reset")
def reset():
    data = request.get_json(silent=True) or request.form or {}
    token = (data.get("token") or "").strip()
    new_password = (data.get("password") or "").encode("utf-8")
    if not token or not new_password:
        return jsonify({"error": "invalid"}), 400

    # Busca token válido
    row = (
        db.session.execute(
            text(
                """
            SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
            FROM password_resets pr
            WHERE pr.token = :t
            LIMIT 1
        """
            ),
            {"t": token},
        )
        .mappings()
        .first()
    )

    if not row or row["used_at"] is not None or row["expires_at"] < datetime.now(timezone.utc):
        return jsonify({"error": "invalid or expired"}), 400

    # Atualiza senha
    pw_hash = bcrypt.hashpw(new_password, bcrypt.gensalt()).decode()
    db.session.execute(
        text("UPDATE users SET password_hash=:h WHERE id=:uid"),
        {"h": pw_hash, "uid": row["user_id"]},
    )
    db.session.execute(
        text("UPDATE password_resets SET used_at = NOW() WHERE id = :id"),
        {"id": row["id"]},
    )
    db.session.commit()
    return jsonify({"ok": True})
