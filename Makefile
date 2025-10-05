.PHONY: backend frontend hooks migrate

hooks:
	cd backend && pre-commit install


backend:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt


frontend:
	cd frontend && npm i


migrate:
	cd backend && alembic revision --autogenerate -m "init" && alembic upgrade head