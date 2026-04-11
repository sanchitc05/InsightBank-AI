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
- **Framework:** React 19 + Vite for optimal developer experience and builds
- **State Management:** React Query for reliable data synchronization and caching
- **Visualization:** Recharts for dynamic, interactive data visualization
- **Styling:** Tailwind CSS for a responsive, sleek, and premium design

### ⚙️ Backend
- **Framework:** FastAPI running on Uvicorn ASGI server
- **Database:** MySQL 8.0 with SQLAlchemy 2.0 ORM & Alembic migrations
- **Data Pipeline:** `pdfplumber`, `pypdf2`, and `pytesseract` for robust OCR
- **AI/ML Engine:** `scikit-learn` & `fuzzywuzzy` for pattern matching and insights

---

## 🚀 Getting Started

Follow these steps to get a local instance of InsightBank-AI up and running.

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Git

### 1️⃣ Backend Setup

```bash
# Clone the repository and navigate to backend
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows: .\venv\Scripts\Activate.ps1
# On macOS/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials (DB_HOST, DB_USER, DB_PASS...)

# Initialize and apply database migrations
alembic upgrade head
#(Or manually import: mysql -u root -p < schema.sql)

# Start the FastApi backend
uvicorn app.main:app --reload
```
*API runs at `http://localhost:8000`. Access Swagger UI at `http://localhost:8000/docs`*

### 2️⃣ Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
*App is live at `http://localhost:5173`*

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
2. Create a dedicated feature branch (`git checkout -b feature/amazing-feature`).
3. Commit using conventional commit formats (`feat(scope): added amazing thing`).
4. Ensure tests run successfully (`pytest` / `npm run test`).
5. Open a Pull Request!

Check out [CONTRIBUTING.md](CONTRIBUTING.md) and [PROJECT_RULES.md](docs/PROJECT_RULES.md) for more details.

---

> **InsightBank AI** – Managing finances shouldn't be archaic.

<p align="center">
  <small>Released under the <a href="LICENSE">MIT License</a>. Created in April 2026.</small>
</p>
