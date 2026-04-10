# Contributing to InsightBank AI

Thank you for your interest in contributing! This guide will help you get started.

## 🛠️ Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Git

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/InsightBank-AI.git
cd InsightBank-AI
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # then edit with your DB credentials
uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📐 Code Style

| Area | Convention |
|------|-----------|
| Python | PEP 8, enforced by **Ruff** |
| JavaScript / JSX | ESLint flat config (see `eslint.config.js`) |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description` |

### Examples

```
feat(parser): add Axis Bank statement support
fix(insights): resolve duplicate anomaly detection
refactor(analytics): extract shared summary logic
docs: update API endpoint list in README
```

## 🔄 Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** — keep commits atomic (one logical change per commit).

3. **Run checks locally**:
   ```bash
   # Backend
   cd backend
   ruff check .
   pytest tests/ -v

   # Frontend
   cd frontend
   npm run lint
   npm run test
   ```

4. **Push & open a Pull Request** against `main`.

5. CI will run lint + test automatically. All checks must pass before merge.

## 🧪 Testing Guidelines

- **Backend**: Add tests under `backend/tests/`. Use `pytest` + `pytest-asyncio`.
- **Frontend**: Add tests under `frontend/src/__tests__/` or co-located `*.test.jsx` files. Use Vitest + React Testing Library.

## 🐛 Reporting Bugs

Open an issue with:
- Descriptive title
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or logs (if applicable)

## 💡 Suggesting Features

Open a feature request issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
