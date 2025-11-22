# backend/app/models.py
from datetime import datetime
from sqlalchemy import UniqueConstraint
from app.extensions import db

# ---------- Users ----------
class User(db.Model):
    __tablename__ = "users"
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(200))
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

# ---------- Glossaries ----------
class Glossary(db.Model):
    __tablename__ = "glossaries"
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(200), nullable=False)
    locale_src = db.Column(db.String(10), nullable=False)  # ex: pt-BR
    locale_dst = db.Column(db.String(10), nullable=False)  # ex: en-US
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    terms = db.relationship("GlossaryTerm", cascade="all, delete-orphan", backref="glossary")

class GlossaryTerm(db.Model):
    __tablename__ = "glossary_terms"
    id          = db.Column(db.Integer, primary_key=True)
    glossary_id = db.Column(db.Integer, db.ForeignKey("glossaries.id"), index=True, nullable=False)
    src         = db.Column(db.String(400), nullable=False)
    dst         = db.Column(db.String(400), nullable=False)
    notes       = db.Column(db.Text)

    __table_args__ = (UniqueConstraint("glossary_id", "src", name="uq_glossary_src"),)

# ---------- Jobs ----------
class Job(db.Model):
    __tablename__ = "jobs"
    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(255))  # usado para exibir nome base (filename)
    status      = db.Column(
        db.Enum("queued", "processing", "done", "failed", "mixed", name="job_status"),
        default="queued", index=True
    )
    source_lang = db.Column(db.String(10), nullable=False)
    # CSV dos destinos selecionados (compatibilidade com UI/listagem)
    target_lang = db.Column(db.Text, nullable=True)
    glossary_id = db.Column(db.Integer, db.ForeignKey("glossaries.id"))
    created_by  = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    files   = db.relationship("JobFile",   cascade="all, delete-orphan", backref="job")
    targets = db.relationship("JobTarget", cascade="all, delete-orphan", backref="job")

class JobFile(db.Model):
    __tablename__ = "job_files"
    id         = db.Column(db.Integer, primary_key=True)
    job_id     = db.Column(db.Integer, db.ForeignKey("jobs.id"), index=True, nullable=False)
    filename   = db.Column(db.String(255), nullable=False)
    input_path = db.Column(db.String(500), nullable=False)
    output_path= db.Column(db.String(500))
    error      = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class JobTarget(db.Model):
    __tablename__ = "job_targets"
    id          = db.Column(db.Integer, primary_key=True)
    job_id      = db.Column(db.Integer, db.ForeignKey("jobs.id"), index=True, nullable=False)
    target_lang = db.Column(db.Text, nullable=True)
    status      = db.Column(
        db.Enum("queued", "processing", "done", "failed", name="job_target_status"),
        default="queued", index=True
    )
    output_path = db.Column(db.String(500))
    error       = db.Column(db.Text)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ---------- Metrics ----------
class Metric(db.Model):
    __tablename__ = "metrics"
    id        = db.Column(db.Integer, primary_key=True)
    job_id    = db.Column(db.Integer, db.ForeignKey("jobs.id"), index=True, nullable=False)
    key       = db.Column(db.String(100), nullable=False)
    value     = db.Column(db.String(200), nullable=False)
    created_at= db.Column(db.DateTime, default=datetime.utcnow)
