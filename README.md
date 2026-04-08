# InsightBank AI

A comprehensive full-stack intelligent financial analysis platform that transforms bank statements into actionable insights using AI-powered analysis.

> Production-grade architecture with React Query, Error Boundaries, and request cancellation.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-18-61dafb)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/fastapi-modern-009688)](https://fastapi.tiangolo.com/)
[![Status](https://img.shields.io/badge/status-production%20ready-green)]()

## 📋 Overview

**InsightBank-AI** is a full-stack web application that transforms raw bank statements into actionable financial intelligence. Upload PDF statements from multiple Indian banks (SBI, HDFC, ICICI), and the platform automatically:

- 📄 **Extracts** transaction data from bank statements
- 🏷️ **Categorizes** transactions intelligently
- 📊 **Visualizes** spending patterns and trends
- 🤖 **Generates** AI-powered financial insights and anomaly detection

Perfect for personal finance management, expense tracking, and financial analysis.

---

## ✨ Key Features

- **Multi-Bank Support**: Parse statements from SBI, HDFC, ICICI, and extensible for others
- **Intelligent Parsing**: OCR-enabled PDF extraction with fuzzy matching for merchant names
- **Smart Categorization**: Automatic transaction categorization with 10+ predefined categories
- **Rich Analytics**: Spending trends, income patterns, budget analysis, and anomaly detection
- **Interactive Dashboard**: Real-time charts, filters, and transaction browsing
- **REST API**: Fully documented REST API for programmatic access
- **Secure**: Environment-based configuration, CORS protection, database isolation

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19 + Vite (lightning-fast development and builds)
- Recharts for interactive data visualization
- React Router for client-side navigation
- Tailwind CSS for responsive styling
- Axios for HTTP requests

**Backend:**
- FastAPI (modern async Python framework)
- Uvicorn ASGI server
- SQLAlchemy 2.0 ORM with Alembic migrations
- MySQL 8.0 database

**Data Processing:**
- `pdfplumber` & `pypdf2` for PDF extraction
- `pytesseract` for OCR capability
- `pandas` & `numpy` for data analysis
- `scikit-learn` for machine learning features
- `fuzzywuzzy` for fuzzy string matching

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Copy and edit .env file with your MySQL credentials
cp .env.example .env

# Initialize database
mysql -u root -p < schema.sql

# Start backend server (runs on http://localhost:8000)
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## 📁 Project Structure

```
InsightBank-AI/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── database.py             # SQLAlchemy setup
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── statement.py
│   │   │   ├── transaction.py
│   │   │   ├── category.py
│   │   │   └── insight.py
│   │   ├── routers/                # API endpoints
│   │   │   ├── statements.py
│   │   │   ├── transactions.py
│   │   │   ├── analytics.py
│   │   │   └── insights.py
│   │   ├── parsers/                # Bank statement parsers
│   │   │   ├── base_parser.py
│   │   │   ├── sbi_parser.py
│   │   │   ├── hdfc_parser.py
│   │   │   ├── icici_parser.py
│   │   │   └── parser_factory.py
│   │   ├── analytics/              # Data analysis modules
│   │   │   ├── categorizer.py
│   │   │   ├── insights_engine.py
│   │   │   └── trend_analyzer.py
│   │   └── schemas/                # Pydantic models for validation
│   ├── requirements.txt            # Python dependencies
│   ├── schema.sql                  # Database schema
│   └── .env                        # Environment configuration (git-ignored)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                # React entry point
│   │   ├── App.jsx                 # Root component
│   │   ├── components/             # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── StatementList.jsx
│   │   │   ├── TransactionTable.jsx
│   │   │   ├── InsightCard.jsx
│   │   │   ├── MonthPicker.jsx
│   │   │   └── ...
│   │   ├── charts/                 # Chart components
│   │   │   ├── BalanceLine.jsx
│   │   │   ├── CategoryPie.jsx
│   │   │   ├── IncomeExpenseBar.jsx
│   │   │   └── SpendHeatmap.jsx
│   │   ├── pages/                  # Page components
│   │   ├── services/               # API services
│   │   ├── hooks/                  # Custom React hooks
│   │   └── utils/                  # Utility functions
│   ├── package.json                # Node.js dependencies
│   ├── vite.config.js              # Vite configuration
│   └── index.html                  # HTML entry point
│
├── docs/
│   ├── model-selection-playbook.md
│   ├── runbook.md
│   └── token-optimization-guide.md
│
├── PROJECT_RULES.md                # GSD methodology guidelines
├── GSD-STYLE.md                    # Style and conventions
├── model_capabilities.yaml         # Model selection criteria
├── LICENSE                         # MIT License
└── README.md                       # This file
```

---

## 🔌 API Documentation

The backend provides a REST API with the following main endpoints:

### Statements
- `POST /api/v1/statements/upload` - Upload a bank statement (PDF)
- `GET /api/v1/statements` - List all uploaded statements
- `GET /api/v1/statements/{id}` - Get statement details
- `DELETE /api/v1/statements/{id}` - Delete a statement

### Transactions
- `GET /api/v1/transactions` - List transactions (with filtering)
- `GET /api/v1/transactions/{id}` - Get transaction details
- `PUT /api/v1/transactions/{id}` - Update transaction (e.g., category)

### Analytics
- `GET /api/v1/analytics/summary` - Monthly summary statistics
- `GET /api/v1/analytics/spending-by-category` - Category-wise breakdown
- `GET /api/v1/analytics/trends` - Temporal spending trends
- `GET /api/v1/analytics/heatmap` - Spending heatmap data

### Insights
- `GET /api/v1/insights` - List AI-generated insights
- `GET /api/v1/insights/anomalies` - Detected anomalies
- `GET /api/v1/insights/patterns` - Identified patterns
- `GET /api/v1/insights/recommendations` - Financial recommendations

Interactive API documentation available at:
```
http://localhost:8000/docs (Swagger UI)
http://localhost:8000/redoc (ReDoc)
```

---

## 📊 Database Schema

The system uses four main tables:

- **statements**: Uploaded bank statements with metadata
- **transactions**: Individual transactions extracted from statements
- **categories**: Predefined spending categories with keywords and styling
- **insights**: AI-generated insights, anomalies, patterns, and recommendations

See [schema.sql](backend/schema.sql) for complete schema definition.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=bank_analyzer

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=50000000  # 50MB

# Server
DEBUG=False
API_BASE_URL=http://localhost:8000
```

**Note:** Always add `.env` to `.gitignore` and never commit sensitive credentials.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm run test
```

---

## 📖 Supported Banks

Currently supported PDF formats:

| Bank | Logo | Format | Status |
|------|------|--------|--------|
| SBI | 🏦 | Standard Statement | ✅ Full Support |
| HDFC | 🏦 | Standard Statement | ✅ Full Support |
| ICICI | 🏦 | Standard Statement | ✅ Full Support |

**Contributing**: To add support for additional banks, see the [Parser Implementation Guide](docs/parser-guide.md).

---

## 🤝 Development Workflow

This project follows the **GSD (Get Shit Done)** methodology:

1. **Spec** → Define requirements until `FINALIZED`
2. **Plan** → Break into phases and tasks
3. **Execute** → Implement with atomic commits
4. **Verify** → Empirical evidence of completion
5. **Commit** → Atomic commits per task

See [PROJECT_RULES.md](PROJECT_RULES.md) and [GSD-STYLE.md](GSD-STYLE.md) for detailed guidelines.

### Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test
npm run lint      # Frontend linting
pytest           # Backend tests

# Commit with atomic, descriptive messages
git commit -m "feat(scope): description"

# Push and create a pull request
git push origin feature/your-feature-name
```

### Commit Message Format

```
type(scope): description

[optional body]
[optional footer]
```

Examples:
- `feat(parser): add Axis Bank statement support`
- `fix(insights): resolve duplicate anomaly detection`
- `refactor(analytics): improve categorization algorithm`

---

## 📚 Documentation

- [Model Selection Playbook](docs/model-selection-playbook.md) - Choosing the right model for tasks
- [Runbook](docs/runbook.md) - Operational procedures
- [Token Optimization Guide](docs/token-optimization-guide.md) - Prompt engineering best practices

---

## 🐛 Troubleshooting

### Backend issues

**Port already in use:**
```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

**Database connection failed:**
- Verify MySQL is running: `mysql -u root -p -e "SELECT 1;"`
- Check credentials in `.env` file
- Ensure database exists: `CREATE DATABASE bank_analyzer;`

**PDF parsing errors:**
- Verify file is a valid PDF
- Check if file is password-protected
- Ensure Tesseract is installed (for OCR): `apt-get install tesseract-ocr`

### Frontend issues

**Vite not starting:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**API calls failing:**
- Verify backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify frontend CORS settings match backend configuration

---

## 📈 Performance Optimization

- Frontend builds with Vite for optimal bundle size
- FastAPI uses async/await for non-blocking request handling
- Database queries optimized with indexes on common filters
- PDF parsing parallelized for batch uploads
- Caching strategies implemented for frequently accessed data

---

## 🔐 Security

- **CORS Protection**: Frontend-only origin allowed
- **Input Validation**: All user inputs validated with Pydantic
- **SQL Injection Prevention**: Using SQLAlchemy ORM
- **Environment Secrets**: Sensitive data in `.env` (git-ignored)
- **File Upload Security**: File type validation and size limits
- **Rate Limiting**: Can be added at Uvicorn or reverse proxy level

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋 Support & Contributing

### Found a Bug?
Open an issue with:
- Descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

### Want to Contribute?
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

Your contributions are welcome!

---

## 📞 Contact

For questions, feature requests, or feedback:
- Open an issue on GitHub
- Email: [your-email@example.com]

---

## 🙌 Acknowledgments

- FastAPI for the exceptional web framework
- React and Vite for the modern frontend stack
- pdfplumber for reliable PDF extraction
- The open-source community for amazing libraries

---

**Last Updated:** April 2026  
**Version:** 1.0.0  
**Status:** Active Development
