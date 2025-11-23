# backend/app/routes/jobs.py
from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from sqlalchemy import or_, cast, String, asc

from app.extensions import db
from app.utils.auth_middleware import token_required
from app.utils.docx_pipeline import run_docx_to_docx

# MODELOS
from app.models import (
    Job,
    JobFile,
    Metric,
    JobTarget,
    GlossaryTerm,  # se não existir, remova o bloco do glossário mais abaixo
)

# bp = Blueprint("jobs", __name__, url_prefix="/jobs")
bp = Blueprint("jobs", __name__)

# Diretórios base (pasta backend/)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = PROJECT_ROOT / "uploads"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ----------------- Helpers -----------------
def _page_int(v, default):
    try:
        i = int(v)
        return i if i > 0 else default
    except Exception:
        return default


def target_to_dict(t: JobTarget) -> dict:
    """Serialização padrão de JobTarget (aceita target_lang ou lang)."""
    lang = getattr(t, "target_lang", None) or getattr(t, "lang", None)
    return {
        "id": t.id,
        "job_id": t.job_id,
        "lang": lang,
        "status": t.status,
        "file_id": getattr(t, "file_id", None),
        "output_path": getattr(t, "output_path", None),
        "error": getattr(t, "error", None),
        "created_at": t.created_at.isoformat() if getattr(t, "created_at", None) else None,
        "updated_at": t.updated_at.isoformat() if getattr(t, "updated_at", None) else None,
    }


def _job_to_item(j: Job) -> dict:
    """Serializa um Job para a lista (usa o primeiro arquivo como título)."""
    jf = db.session.query(JobFile).filter(JobFile.job_id == j.id).order_by(JobFile.id.asc()).first()
    targets = (
        db.session.query(JobTarget)
        .filter(JobTarget.job_id == j.id)
        .order_by(JobTarget.id.asc())
        .all()
    )
    targets_ser = [target_to_dict(t) for t in targets]

    return {
        "id": j.id,
        "title": (jf.filename if jf else None),
        "status": j.status,
        "source_lang": j.source_lang,
        "target_lang": j.target_lang,  # CSV (compat)
        "targets": targets_ser,  # nome novo
        "destinos": [  # compat com versões anteriores do front
            {"id": t["id"], "lang": t["lang"], "status": t["status"]} for t in targets_ser
        ],
        "updated_at": (
            (j.updated_at or j.created_at).isoformat() if (j.updated_at or j.created_at) else None
        ),
    }


# -------------------------------------------


# LISTAR JOBS: GET /api/jobs
@bp.get("", strict_slashes=False)
@bp.get("/", strict_slashes=False)
@token_required
def list_jobs():
    """Lista paginada com busca por ID (parcial) e filename."""
    q = (request.args.get("q") or "").strip()
    page = _page_int(request.args.get("page"), 1)
    page_size = min(max(_page_int(request.args.get("page_size"), 10), 1), 100)

    base = db.session.query(Job)

    if q:
        like = f"%{q}%"
        base = base.join(JobFile, JobFile.job_id == Job.id).filter(
            or_(
                cast(Job.id, String).ilike(like),
                JobFile.filename.ilike(like),
            )
        )

    total = base.count()
    rows = (
        base.order_by(Job.updated_at.desc().nullslast(), Job.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [_job_to_item(j) for j in rows]
    return jsonify({"items": items, "total": total, "page": page, "page_size": page_size})


# DETALHE: GET /api/jobs/<id>
@bp.get("/<int:job_id>")
@token_required
def get_job(job_id: int):
    j = db.session.get(Job, job_id)
    if not j:
        return jsonify({"error": "not found"}), 404

    resp = _job_to_item(j)

    # agrega métricas do job (tabela Metric)
    metrics_rows = db.session.query(Metric).filter(Metric.job_id == job_id).all()

    def _coerce(v: str):
        # tenta converter para número (int/float); senão devolve string original
        try:
            if v is None:
                return None
            if "." in v:
                return float(v)
            return int(v)
        except Exception:
            return v

    resp["metrics"] = {m.key: _coerce(m.value) for m in metrics_rows}

    return jsonify(resp)


# CRIAR: POST /api/jobs
@bp.post("/")
@token_required
def create_job():
    """Cria um job com 1 arquivo e N destinos (target_langs)."""
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "file is required"}), 400

    source_lang = (request.form.get("source_lang") or "pt-BR").strip()

    # target_langs pode vir como múltiplos campos; cai para target_lang (singular) se preciso
    raw_targets = request.form.getlist("target_langs") or []
    # normaliza, deduplica e BLOQUEIA De=Para
    uniq_targets = []
    seen = set()
    for t in raw_targets:
        t = (t or "").strip()
        if not t or t == source_lang:
            continue
        if t not in seen:
            seen.add(t)
            uniq_targets.append(t)

    if not uniq_targets:
        return (
            jsonify({"error": "Nenhum destino válido. Selecione idiomas diferentes de 'De'."}),
            400,
        )

    glossary_id_raw = request.form.get("glossary_id")
    glossary_id = int(glossary_id_raw) if glossary_id_raw else None
    user_id = getattr(request, "user_id", None)

    filename = secure_filename(f.filename or "input.docx")

    job = Job(
        status="processing",
        source_lang=source_lang,
        target_lang=",".join(uniq_targets),  # compat (CSV)
        glossary_id=glossary_id,
        created_by=user_id,
        title=filename,  # se sua tabela jobs tiver 'title'
    )
    db.session.add(job)
    db.session.flush()  # garante job.id

    in_path = str(UPLOAD_DIR / f"{job.id}_{filename}")
    f.save(in_path)

    db.session.add(JobFile(job_id=job.id, filename=filename, input_path=in_path))
    db.session.flush()

    # Cria um JobTarget por idioma
    targets: list[JobTarget] = []
    for lang in uniq_targets:
        jt = JobTarget(job_id=job.id, target_lang=lang, status="processing")
        db.session.add(jt)
        targets.append(jt)

    db.session.commit()

    # ---- Carrega glossário (se houver) ----
    glossary = {}
    if glossary_id:
        try:
            rows = (
                db.session.query(GlossaryTerm.src, GlossaryTerm.dst)
                .filter(GlossaryTerm.glossary_id == glossary_id)
                .all()
            )
            glossary = {src: dst for src, dst in rows}
        except Exception:
            glossary = {}

    # ---- Processamento sequencial (demo) ----
    errors = []
    for jt in targets:
        try:
            out_path = str(OUTPUT_DIR / f"{job.id}_{jt.target_lang}_{filename}")
            metrics = run_docx_to_docx(
                in_path=in_path,
                out_path=out_path,
                glossary=glossary,
                source_lang=source_lang,
                target_lang=jt.target_lang,
            )
            jt.output_path = out_path
            jt.status = "done"

            # métricas agregadas ao job (se quiser por destino, adicione job_target_id no modelo Metric)
            for k, v in (metrics or {}).items():
                db.session.add(Metric(job_id=job.id, key=str(k), value=str(v)))
        except Exception as e:
            jt.error = str(e)
            jt.status = "failed"
            errors.append(jt.target_lang)

    # Status agregado do job
    statuses = {t.status for t in targets}
    job.status = (
        "done" if statuses == {"done"} else ("failed" if statuses == {"failed"} else "mixed")
    )
    job.updated_at = datetime.utcnow()

    db.session.commit()

    return (
        jsonify(
            {
                "id": job.id,
                "title": filename,
                "status": job.status,
                "source_lang": source_lang,
                "target_langs": uniq_targets,
                "targets": [target_to_dict(t) for t in targets],
                "errors": errors,
            }
        ),
        201,
    )


# LISTAR TARGETS: GET /api/jobs/<id>/targets
@bp.get("/<int:job_id>/targets")
@token_required
def list_job_targets(job_id: int):
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "not found"}), 404

    targets = (
        db.session.query(JobTarget)
        .filter(JobTarget.job_id == job_id)
        .order_by(JobTarget.id.asc())
        .all()
    )
    ser = [target_to_dict(t) for t in targets]

    # status agregado opcional
    any_processing = any(t["status"] in ("queued", "processing") for t in ser)
    all_done = ser and all(t["status"] == "done" for t in ser)
    any_failed = any(t["status"] == "failed" for t in ser)

    if all_done:
        agg = "done"
    elif any_processing and any_failed:
        agg = "mixed"
    elif any_processing:
        agg = "processing"
    elif any_failed:
        agg = "failed"
    else:
        agg = job.status

    return jsonify({"job_id": job_id, "status": agg, "targets": ser})


# DOWNLOAD: GET /api/jobs/<id>/download[?lang=xx-YY]
@bp.get("/<int:job_id>/download")
@token_required
def download(job_id: int):
    """
    Download da saída:
      - Se ?lang=xx-YY for informado: baixa somente aquele destino.
      - Sem lang:
          * Se houver 1 destino concluído => baixa o arquivo desse destino
          * Se houver >1 destinos concluídos => baixa .zip com todos
    """
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "not found"}), 404

    lang = (request.args.get("lang") or "").strip()

    if lang:
        jt = db.session.query(JobTarget).filter_by(job_id=job_id, target_lang=lang).first()
        if (
            not jt
            or jt.status != "done"
            or not jt.output_path
            or not os.path.exists(jt.output_path)
        ):
            return jsonify({"error": "not ready"}), 400

        return send_file(
            jt.output_path,
            as_attachment=True,
            download_name=os.path.basename(jt.output_path),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            max_age=0,
        )

    # Sem lang: agrega todos os destinos concluídos
    targets = (
        db.session.query(JobTarget)
        .filter(JobTarget.job_id == job_id)
        .order_by(JobTarget.id.asc())
        .all()
    )
    done_targets = [
        t for t in targets if t.status == "done" and t.output_path and os.path.exists(t.output_path)
    ]

    if not done_targets:
        return jsonify({"error": "not ready"}), 400

    if len(done_targets) == 1:
        t = done_targets[0]
        return send_file(
            t.output_path,
            as_attachment=True,
            download_name=os.path.basename(t.output_path),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            max_age=0,
        )

    # zip múltiplos
    mem = BytesIO()
    with ZipFile(mem, "w", ZIP_DEFLATED) as z:
        for t in done_targets:
            arcname = os.path.basename(t.output_path)  # ex: 5_fr-FR_sample_pt.docx
            z.write(t.output_path, arcname=arcname)
    mem.seek(0)

    return send_file(
        mem,
        as_attachment=True,
        download_name=f"job_{job_id}_outputs.zip",
        mimetype="application/zip",
        max_age=0,
    )


# DELETE: /api/jobs/<id>  — apaga registros e arquivos do disco (best-effort)
@bp.delete("/<int:job_id>")
@token_required
def delete_job(job_id: int):
    job = db.session.get(Job, job_id)
    if not job:
        return jsonify({"error": "not found"}), 404

    # Coleta caminhos de arquivos para tentar remover do disco depois do commit
    file_paths = []
    for jf in db.session.query(JobFile).filter_by(job_id=job_id).all():
        if getattr(jf, "input_path", None):
            file_paths.append(jf.input_path)

    for jt in db.session.query(JobTarget).filter_by(job_id=job_id).all():
        if getattr(jt, "output_path", None):
            file_paths.append(jt.output_path)

    # Remove filhos (se você tiver FK com ON DELETE CASCADE isso seria opcional)
    db.session.query(Metric).filter(Metric.job_id == job_id).delete(synchronize_session=False)
    db.session.query(JobTarget).filter(JobTarget.job_id == job_id).delete(synchronize_session=False)
    db.session.query(JobFile).filter(JobFile.job_id == job_id).delete(synchronize_session=False)

    # Remove o job em si
    db.session.delete(job)
    db.session.commit()

    # Remove arquivos do disco — melhor esforço
    removed = 0
    for p in file_paths:
        try:
            if p and os.path.exists(p):
                os.remove(p)
                removed += 1
        except Exception:
            # não falha a requisição por causa de erro de IO
            pass

    return jsonify({"ok": True, "removed_files": removed})
