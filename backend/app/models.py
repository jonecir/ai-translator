from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Glossary(Base):
    __tablename__ = "glossaries"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    locale_src = Column(String(10), nullable=False) # ex: pt-BR
    locale_dst = Column(String(10), nullable=False) # ex: en-US
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    terms = relationship("GlossaryTerm", cascade="all, delete-orphan", backref="glossary")


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"
    id = Column(Integer, primary_key=True)
    glossary_id = Column(Integer, ForeignKey("glossaries.id"), index=True, nullable=False)
    src = Column(String(400), nullable=False)
    dst = Column(String(400), nullable=False)
    notes = Column(Text)
    __table_args__ = (UniqueConstraint("glossary_id", "src", name="uq_glossary_src"),)


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True)
    status = Column(Enum("queued", "processing", "done", "failed", name="job_status"), default="queued", index=True)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    glossary_id = Column(Integer, ForeignKey("glossaries.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    files = relationship("JobFile", cascade="all, delete-orphan", backref="job")


class JobFile(Base):
    __tablename__ = "job_files"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    input_path = Column(String(500), nullable=False)
    output_path = Column(String(500))
    error = Column(Text)


class Metric(Base):
    __tablename__ = "metrics"
    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), index=True, nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

