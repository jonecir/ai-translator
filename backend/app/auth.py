from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
import jwt


bp = Blueprint("auth", __name__)


# dummy login (trocar por hash)
USERS = {"admin@example.com": {"password": "admin", "id": 1}}


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    user = USERS.get(email)
    if not user or user["password"] != password:
        return jsonify({"error": "invalid credentials"}), 401


    exp = datetime.utcnow() + timedelta(minutes=120)
    token = jwt.encode({"user_id": user["id"], "exp": exp}, current_app.config["SECRET_KEY"], algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")

    return jsonify({"token": token, "expires_at": exp.isoformat()})




def token_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing token"}), 401

        token = auth.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            request.user_id = payload.get("user_id")
        except Exception as e:
            return jsonify({"error": f"invalid token: {e}"}), 401

        return fn(*args, **kwargs)


        return wrapper