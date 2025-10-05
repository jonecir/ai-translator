import os
from uuid import uuid4
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from ..auth import token_required
from ..utils.docx_pipeline import run_docx_to_docx
from .glossaries import GLOSSARIES


bp = Blueprint("jobs", __name__)


UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "uploads"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.getcwd(), "outputs"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# memória simples para demo
JOBS = {}


@bp.route("/jobs", methods=["POST"])
@token_required
def create_job():
    """Cria job (DOCX→DOCX) com um arquivo e um glossário opcional."""
    glossary_id = int(request.form.get("glossary_id") or 1)
    source_lang = request.form.get("source_lang", "pt-BR")
    target_lang = request.form.get("target_lang", "en-US")
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "file is required"}), 400


    filename = secure_filename(f.filename)
    job_id = str(uuid4())
    in_path = os.path.join(UPLOAD_DIR, f"{job_id}_{filename}")
    out_path = os.path.join(OUTPUT_DIR, f"{job_id}_{filename}")
    f.save(in_path)


    glossary = GLOSSARIES.get(glossary_id, {}).get("terms", {})


    try:
        metrics = run_docx_to_docx(in_path, out_path, glossary)
        JOBS[job_id] = {
            "id": job_id,
            "status": "done",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "glossary_id": glossary_id,
            "input": in_path,
            "output": out_path,
            "metrics": metrics,
        }
    except Exception as e:
        JOBS[job_id] = {"id": job_id, "status": "failed", "error": str(e)}
        return jsonify(JOBS[job_id]), 500

    return jsonify(JOBS[job_id])


@bp.route("/jobs/<job_id>", methods=["GET"])
@token_required
def get_job(job_id):
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "not found"}), 404
    return jsonify(job)