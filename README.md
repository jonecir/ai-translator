1. Clone & prepare
    git clone <SEU_REPO>.git ai-translator
    cd ai-translator
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env

2. PostgreSQL (local ou via Docker Compose). Atualize DATABASE_URL no .env.

3. Backend
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    pre-commit install
    alembic revision --autogenerate -m "init"
    alembic upgrade head
    python run.py

4. Frontend
    cd ../frontend
    npm i
    npm run dev

5. Login (dummy): POST /api/login com { email: "admin@example.com", password: "admin" }. Salve token no localStorage (ou adicione um login simples depois).

6. Testar pipeline DOCX→DOCX em /jobs: subir .docx e observar metrics retornadas (contagem de substituições por termo).

7. Importar Glossário (CSV) em /glossaries: CSV com cabeçalho src,dst.