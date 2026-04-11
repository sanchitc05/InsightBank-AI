# Contributing to InsightBank AI

Thank you for your interest in contributing to InsightBank AI! This document provides guidelines for setting up the project locally and submitting contributions.

## Project Architecture

- **Backend**: FastAPI (Python)
  - Modular parsers in `backend/app/parsers/`
  - SQL Alchemy for ORM
  - Pydantic for schemas and validation
- **Frontend**: React (Vite, JavaScript)
  - Modern, premium UI with Vanilla CSS
  - React Query for state management

## Getting Started

### Backend Setup
1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` or `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Set up `.env` (copy from `.env.example`)
6. Run the server: `python -m app.main`

### Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Coding Standards

### Python
- Follow PEP 8 guidelines.
- Use type hints for all function arguments and return values.
- Document complex logic with docstrings (Google style preferred).

### JavaScript/React
- Use functional components and hooks.
- Keep components focused and small.
- Avoid inline styles where possible; use the design system variables in `index.css`.

## Pull Request Process

1. Create a feature branch from `main`.
2. Ensure all tests pass:
   - Backend: `pytest`
   - Frontend: `npm test`
3. Update documentation (README.md, ROADMAP.md) if necessary.
4. Submit the PR with a clear description of the changes.

## Testing

We prioritize empirical validation.
- **Backend Tests**: Located in `backend/tests/`. Run with `pytest`.
- **Frontend Tests**: Located in `frontend/src/__tests__/`. Run with `npm test`.
