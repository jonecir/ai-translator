# backend/app/routes/me.py
from flask import Blueprint, jsonify, request
from app.utils.auth_middleware import token_required

bp = Blueprint("me", __name__)

@bp.route("/me", methods=["GET"])
@token_required
def me():
    return jsonify({"user_id": getattr(request, "user_id", None)})
