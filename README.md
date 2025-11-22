# 🌐 AI Translator

### *Bilingual README --- English / Português*

# 🇺🇸 English Version

## 🚀 Overview

AI Translator is a lightweight translation platform powered by AI
models, offering multi-language document translation, glossary
enforcement, per-language metrics, cost tracking, and a clean responsive
interface.

Designed for simplicity, transparency, and fast iteration --- ideal for
teams who need accurate document translation with full visibility into
processing.

## 🧩 Architecture

    ai-translator/
     ├── backend/        → Flask API, SQLAlchemy ORM, Alembic, JWT Auth
     ├── frontend/       → React + Vite + Tailwind
     ├── docker-compose.yml
     └── README.md

### Backend

-   Python 3.12 + Flask\
-   SQLAlchemy ORM\
-   Alembic migrations\
-   JWT authentication\
-   PostgreSQL\
-   OpenAI API

### Frontend

-   React + Vite\
-   i18next (11 languages)
-   TailwindCSS\
-   Global job polling\
-   File uploads and multi-destination translations

## ⚙️ Quick Setup (Simplified)

### 1) Backend

    cd backend
    cp .env.example .env
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    alembic upgrade head
    python run.py

### 2) Frontend

    cd frontend
    npm install
    npm run dev

### 3) Docker (optional)

    docker-compose up --build

## 📡 API -- Main Endpoints

### Auth

  Method   Endpoint        Description
  -------- --------------- ---------------------------
  POST     `/api/login`    Login
  POST     `/api/forgot`   Request password recovery
  POST     `/api/reset`    Reset password

### Jobs

  Method   Endpoint               Description
  -------- ---------------------- ---------------------------
  GET      `/jobs`                List jobs
  POST     `/jobs`                Create job
  GET      `/jobs/:id`            Get job details
  GET      `/jobs/:id/download`   Download translated files
  DELETE   `/jobs/:id`            Remove job

### Glossaries

  Method   Endpoint            Description
  -------- ------------------- -------------
  GET      `/glossaries`       List
  POST     `/glossaries`       Create
  DELETE   `/glossaries/:id`   Delete

## 🚀 Deployment Options

### Render

Backend:

    pip install -r requirements.txt
    python run.py

Frontend:

    npm install
    npm run build

### Railway

-   Auto-detected Python\
-   PostgreSQL plugin\
-   Set environment variables

### Docker

    docker-compose up -d --build

## 🤝 Contributing

Pull requests are welcome!

## 📄 License

MIT License

# 🇧🇷 Versão em Português

## 🚀 Visão Geral

O AI Translator é uma plataforma simples e eficiente de tradução
automática, oferecendo tradução de documentos, múltiplos idiomas,
glossários personalizados e métricas.

## 🧩 Arquitetura

    ai-translator/
     ├── backend/        
     ├── frontend/       
     ├── docker-compose.yml
     └── README.md

### Backend

-   Flask, SQLAlchemy, Alembic, PostgreSQL, JWT, OpenAI API

### Frontend

-   React + Vite, TailwindCSS, i18next

## ⚙️ Setup Rápido (Simplificado)

### Backend

    cd backend
    cp .env.example .env
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    alembic upgrade head
    python run.py

### Frontend

    cd frontend
    npm install
    npm run dev

### Docker

    docker-compose up --build

## 📡 API --- Principais Endpoints

### Autenticação

  Método   Endpoint        Descrição
  -------- --------------- -----------------
  POST     `/api/login`    Login
  POST     `/api/forgot`   Recuperar senha
  POST     `/api/reset`    Redefinir senha

### Jobs

  Método   Endpoint               Descrição
  -------- ---------------------- -----------
  GET      `/jobs`                Listar
  POST     `/jobs`                Criar
  GET      `/jobs/:id`            Detalhes
  GET      `/jobs/:id/download`   Baixar
  DELETE   `/jobs/:id`            Remover

### Glossários

  Método   Endpoint            Descrição
  -------- ------------------- -----------
  GET      `/glossaries`       Listar
  POST     `/glossaries`       Criar
  DELETE   `/glossaries/:id`   Excluir

## 🤝 Contribuição

Sugestões são bem-vindas!

## 📄 Licença

Licença MIT
