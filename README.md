<div align="center">
  <img src="assets\Screenshot 2026-04-11 152747.png" alt="InsightBank AI Dashboard" width="100%" />

  # 🏦 InsightBank AI

  **Transforming raw bank statements into actionable, AI-powered financial intelligence.**

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Python](https://img.shields.io/badge/python-3.10+-blue)](https://www.python.org/)
  [![React](https://img.shields.io/badge/react-18-61dafb)](https://react.dev/)
  [![FastAPI](https://img.shields.io/badge/fastapi-modern-009688)](https://fastapi.tiangolo.com/)
  [![Status](https://img.shields.io/badge/status-production%20ready-green)]()

  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-supported-banks">Supported Banks</a>
  </p>
</div>

---

## 📋 Overview

**InsightBank-AI** is a comprehensive full-stack intelligent financial analysis platform. Say goodbye to manual spreadsheet analysis. Upload your PDF statements from multiple Indian banks (SBI, HDFC, ICICI), and let our AI engine instantly index, categorize, and analyze your financial footprint.

<img src="assets/parsing_illustration.png" alt="AI Parsing Documents" width="100%" />

---

## ✨ Key Features

| 🚀 Fast & Intelligent | 📊 Rich Analytics | 🔒 Secure & Extensible |
| :--- | :--- | :--- |
| **Multi-Bank Support:** Seamlessly parse statements from SBI, HDFC, ICICI. | **Spending Trends:** Interactive charts for budget analysis and temporal spending. | **Local Processing:** Isolated database keeps your financial data secure. |
| **Smart Parsing:** OCR-enabled PDF extraction with fuzzy matching for merchants. | **Detect Anomalies:** AI-driven financial insights highlight unusual patterns. | **RESTful API:** Fully documented OpenAPI interface for programmatic access. |
| **Auto Categorization:** Categorize transactions with 10+ predefined categories. | **Dynamic Dashboard:** Real-time feedback with responsive React Query states. | **Robust Architecture:** Built with FastAPI, SQLAlchemy, and Vite. |

---

## 🏗️ Architecture

Built on a modern, robust, and lightning-fast technology stack.

### 🌐 Frontend
- **Framework:** React 19 + Vite (Next-gen development)
- **State Management:** React Query (Enterprise-grade caching)
- **Visualization:** Recharts (Dynamic interactive data)
- **Styling:** Premium Vanilla CSS (Custom tokens, Glassmorphism, Glow effects)
- **Testing:** `Vitest` + `React Testing Library`

### ⚙️ Backend
- **Framework:** FastAPI (High performance, type-safe)
- **Database:** PostgreSQL with SQLAlchemy 2.0 ORM
- **Data Pipeline:** `pdfplumber` & `pytesseract` (OCR-enabled parsing)
- **Testing:** `Pytest` (Atomic and functional validation)

---

## 🚀 Getting Started

Quick, copy-paste steps to run the project locally.

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (recommended for PostgreSQL) or a local PostgreSQL 16+
- Git

### One-time backend setup
Run these once to prepare the backend and database schema.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env -Force
alembic upgrade head
```

### Run the app (every time)

1) Start PostgreSQL (Docker):

```powershell
docker run --name insightbank-postgres `
  -e POSTGRES_USER=insightbank `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=bank_analyzer `
  -p 5432:5432 -d postgres:16
# if container already exists: docker start insightbank-postgres
```

2) Start backend (new terminal):

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3) Start frontend (separate terminal):

```powershell
cd frontend
npm install       # only needed when deps change
npm run dev
```

Access:
- Backend API: http://localhost:8000 (Swagger: /docs)
- Frontend: http://localhost:5173

### Stop / cleanup

```powershell
# stop frontend/backend processes (Ctrl+C in each terminal)
docker stop insightbank-postgres
# to remove the container: docker rm insightbank-postgres
```

Notes:
- If your database URL differs, update `DATABASE_URL` in `backend/.env`.
- Use `docker start insightbank-postgres` instead of `docker run` when the container already exists.

---

## 📖 Supported Banks

Currently supported statement formats:

| Bank | Logo | Format | Status |
|------|:---:|--------|:---:|
| **SBI** | 🏦 | Standard PDF | ✅ **Full Support** |
| **HDFC** | 🏦 | Standard PDF | ✅ **Full Support** |
| **ICICI** | 🏦 | Standard PDF | ✅ **Full Support** |

*Contributing: Want to add a new bank? Check out our [Parser Implementation Guide](docs/parser-guide.md).*

---

## 🔌 Core API Capabilities

Our REST API is built to be extensible and easy to integrate:

- **Upload & Parse:** `POST /api/v1/statements/upload`
- **Transactions Management:** `GET /api/v1/transactions` (with rich filtering capabilities)
- **Analytics Engine:** `GET /api/v1/analytics/summary` & `/api/v1/analytics/trends`
- **AI Insights:** `GET /api/v1/insights/anomalies` & `/api/v1/insights/patterns`

---

## 🤝 Contribution & Development

We welcome external maintainers! To contribute:

1. Fork the repository.
2. Read the [CONTRIBUTING.md](docs/CONTRIBUTING.md) guide.
3. Create a dedicated feature branch.
4. Ensure all tests pass:
   - Backend: `pytest`
   - Frontend: `npm test`
5. Open a Pull Request!

Check out [PROJECT_RULES.md](docs/PROJECT_RULES.md) for more details.

---

> **InsightBank AI** – Managing finances shouldn't be archaic.

<p align="center">
  <small>Released under the <a href="LICENSE">MIT License</a>. Created in April 2026.</small>
</p>
