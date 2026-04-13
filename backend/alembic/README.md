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

## Revision ID Policy

- Keep every Alembic `revision` ID at 32 characters or fewer.
- Reason: `alembic_version.version_num` is commonly `VARCHAR(32)` in MySQL.
- Prefer compact IDs such as date + short slug, e.g. `20260413_profile_fields`.
- If you provide a custom ID, use:
   ```bash
   alembic revision --autogenerate -m "Add profile fields" --rev-id 20260413_profile_fields
   ```

Alembic will use the DB connection from your environment variables.
