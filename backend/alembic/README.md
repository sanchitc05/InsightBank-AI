# Alembic Migrations

This folder contains Alembic migration scripts for the Bank Statement Analyzer backend.

## Usage

1. Ensure your `.env` is configured for MySQL (see `.env.example`).
2. Install Alembic if not already installed:
   ```bash
   pip install alembic
   ```
3. To create a new migration after model changes:
   ```bash
   alembic revision --autogenerate -m "Describe your change"
   ```
4. To apply migrations:
   ```bash
   alembic upgrade head
   ```

Alembic will use the DB connection from your environment variables.
