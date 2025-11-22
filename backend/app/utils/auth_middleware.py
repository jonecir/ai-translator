# backend/app/utils/auth_middleware.py
from functools import wraps
from flask import request, jsonify, current_app
import jwt

def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing or invalid Authorization header"}), 401

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return jsonify({"error": "missing token"}), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],  # usa a chave correta
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"invalid token: {str(e)}"}), 401

        request.user_id = payload.get("user_id")
        return fn(*args, **kwargs)

    return wrapper
