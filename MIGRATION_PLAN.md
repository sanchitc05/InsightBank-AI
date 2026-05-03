# PostgreSQL Migration Plan

## Status

InsightBank-AI has been shifted from MySQL to PostgreSQL at the code/configuration level.

The project now treats PostgreSQL as the only supported production database. SQLite remains allowed only for the fast test fixture. MySQL runtime URLs are rejected by `backend/app/database.py`.

## Implemented Changes

### Runtime Configuration

`backend/app/database.py` now:

1. Reads `DATABASE_URL` first.
2. Falls back to PostgreSQL component variables when `DATABASE_URL` is absent.
3. Defaults `DB_TYPE` to `postgresql`.
4. Rejects MySQL component config.
5. Rejects MySQL SQLAlchemy URLs.
6. Uses `pool_pre_ping=True` for non-SQLite engines.
7. Keeps SQLite support only for explicit test URLs.

Primary connection format:

```env
DATABASE_URL=postgresql+psycopg://insightbank:password@localhost:5432/bank_analyzer
```

Component fallback:

```env
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=insightbank
DB_PASS=password
DB_NAME=bank_analyzer
```

### Dependencies

`backend/requirements.txt` and `backend/Pipfile` now use:

```txt
psycopg[binary]>=3.2.0
```

`pymysql` has been removed.

### Schema and Alembic

The old MySQL-shaped Alembic chain has been replaced with one clean PostgreSQL baseline:

```txt
backend/alembic/versions/20260503_0001_postgresql_baseline.py
```

This baseline creates:

- `users`
- `revoked_tokens`
- `categories`
- `statements`
- `transactions`
- `insights`

The baseline uses PostgreSQL-compatible SQLAlchemy types and check constraints instead of MySQL enum/dialect imports.

`backend/schema.sql` has been replaced with a PostgreSQL reference schema. Alembic remains the source of truth for applying schema changes.

### ORM Model Adjustments

`Insight.type` and `Insight.severity` now use `String` plus check constraints instead of SQLAlchemy `Enum`.

`Statement.status` now has a check constraint for:

```txt
PENDING, PROCESSING, SUCCESS, FAILED
```

`Category.keywords` remains generic SQLAlchemy `JSON`.

### Tests

`backend/tests/conftest.py` explicitly sets:

```env
DATABASE_URL=sqlite://
```

This keeps unit tests isolated from local `.env` files.

`backend/tests/test_database_config.py` verifies:

- `DATABASE_URL` takes precedence.
- PostgreSQL component config builds a PostgreSQL URL.
- MySQL component config is rejected.
- MySQL URLs are rejected.
- SQLite remains available for tests.

### Documentation

Updated:

- `README.md`
- `.env.example`
- `backend/.env.example`
- `backend/alembic/README.md`
- `CONTRIBUTING.md`

## Fresh PostgreSQL Setup

Start PostgreSQL locally:

```bash
docker run --name insightbank-postgres \
  -e POSTGRES_USER=insightbank \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=bank_analyzer \
  -p 5432:5432 \
  -d postgres:16
```

Install backend dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Apply migrations:

```bash
cd backend
alembic upgrade head
```

Run the API:

```bash
cd backend
uvicorn app.main:app --reload
```

## Database Access

With the local Docker configuration:

```bash
psql "postgresql://insightbank:password@localhost:5432/bank_analyzer"
```

Useful checks:

```sql
\dt
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM statements;
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM insights;
```

## Existing MySQL Data

The codebase no longer includes the MySQL Python driver. If existing production MySQL data must be imported, use an external migration tool such as `pgloader` or a one-off environment that temporarily has a MySQL driver installed.

Recommended process:

1. Stop writes to the old MySQL database.
2. Take a MySQL backup.
3. Create the PostgreSQL database.
4. Apply `alembic upgrade head`.
5. Copy data in dependency order:
   - `users`
   - `revoked_tokens`
   - `categories`
   - `statements`
   - `transactions`
   - `insights`
6. Reset PostgreSQL sequences.
7. Run validation queries.

Example `pgloader` command:

```bash
pgloader mysql://user:pass@host:3306/bank_analyzer postgresql://insightbank:password@host:5432/bank_analyzer
```

After loading explicit IDs, reset sequences:

```sql
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('revoked_tokens', 'id'), COALESCE((SELECT MAX(id) FROM revoked_tokens), 1));
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval(pg_get_serial_sequence('statements', 'id'), COALESCE((SELECT MAX(id) FROM statements), 1));
SELECT setval(pg_get_serial_sequence('transactions', 'id'), COALESCE((SELECT MAX(id) FROM transactions), 1));
SELECT setval(pg_get_serial_sequence('insights', 'id'), COALESCE((SELECT MAX(id) FROM insights), 1));
```

Validate foreign keys:

```sql
SELECT COUNT(*)
FROM statements s
LEFT JOIN users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

SELECT COUNT(*)
FROM transactions t
LEFT JOIN statements s ON s.id = t.statement_id
WHERE s.id IS NULL;

SELECT COUNT(*)
FROM insights i
LEFT JOIN statements s ON s.id = i.statement_id
WHERE s.id IS NULL;
```

All three counts should be zero.
