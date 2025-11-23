from logging.config import fileConfig
from alembic import context
from pathlib import Path
from dotenv import load_dotenv
import os, sys
from app.database import Base, engine
import app.models  # <- importante para registrar models no metadata

target_metadata = Base.metadata

# Add backend/ ao sys.path para permitir "import app.*"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Carregar .env do backend (opcional, ajuda com DATABASE_URL, etc.)
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(BASE_DIR, ".env"))
except Exception:
    pass

# Importar Base e engine do seu app
from app.database import Base, engine  # noqa

# ⚠️ IMPORTANTE: forçar import dos modelos para registrar as tabelas no metadata
import app.models  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://dbuser:dbuser01@localhost:5432/ai_translator",
    )
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
