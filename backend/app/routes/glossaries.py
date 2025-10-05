from flask import Blueprint, request, jsonify
from ..auth import token_required
import csv
from io import StringIO


bp = Blueprint("glossaries", __name__)


# memória (trocar por DB)
GLOSSARIES = {
    1: {
        "name": "pt-BR→en-US",
        "locale_src": "pt-BR",
        "locale_dst": "en-US",
        "terms": {"juros": "interest", "recurso": "appeal", "petição": "pleading"},
    }
}


@bp.route("/glossaries", methods=["GET"])
@token_required
def list_glossaries():
    return jsonify([{"id": k, **v, "terms": len(v["terms"]) } for k, v in GLOSSARIES.items()])


@bp.route("/glossaries/<int:g_id>", methods=["GET"])
@token_required
def get_glossary(g_id):
    g = GLOSSARIES.get(g_id)
    if not g:
        return jsonify({"error": "not found"}), 404
    return jsonify({"id": g_id, **g})


@bp.route("/glossaries/<int:g_id>/import", methods=["POST"])
@token_required
def import_csv(g_id):
    if g_id not in GLOSSARIES:
        return jsonify({"error": "not found"}), 404
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "csv required"}), 400
    data = file.read().decode("utf-8")
    reader = csv.DictReader(StringIO(data))
    for row in reader:
        src = (row.get("src") or "").strip()
        dst = (row.get("dst") or "").strip()
        if src and dst:
            GLOSSARIES[g_id]["terms"][src] = dst
    return jsonify({"ok": True, "terms": len(GLOSSARIES[g_id]["terms"])})