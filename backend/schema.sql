-- ============================================================
-- InsightBank-AI PostgreSQL Schema
-- Source of truth remains SQLAlchemy models plus Alembic.
-- Apply the live schema with: alembic upgrade head
-- ============================================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'INR',
  profile_image_url VARCHAR(1024),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE revoked_tokens (
  id SERIAL PRIMARY KEY,
  jti VARCHAR(255) NOT NULL UNIQUE,
  revoked_at TIMESTAMP DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  keywords JSON,
  color VARCHAR(10),
  icon VARCHAR(10)
);

CREATE TABLE statements (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(50),
  account_number VARCHAR(30),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT now(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_credit NUMERIC(12, 2),
  total_debit NUMERIC(12, 2),
  status VARCHAR(20) NOT NULL,
  error_log VARCHAR(1024),
  CONSTRAINT ck_statements_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  CONSTRAINT uq_statement_period
    UNIQUE (account_number, month, year, user_id)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  statement_id INTEGER NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  txn_date DATE,
  description TEXT,
  debit NUMERIC(12, 2),
  credit NUMERIC(12, 2),
  balance NUMERIC(14, 2),
  category VARCHAR(50),
  merchant VARCHAR(100)
);

CREATE INDEX idx_txn_date ON transactions (txn_date);
CREATE INDEX idx_category ON transactions (category);
CREATE INDEX idx_statement_id ON transactions (statement_id);

CREATE TABLE insights (
  id SERIAL PRIMARY KEY,
  statement_id INTEGER NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT,
  severity VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT ck_insights_type
    CHECK (type IN ('anomaly', 'pattern', 'tip')),
  CONSTRAINT ck_insights_severity
    CHECK (severity IN ('info', 'warn', 'alert'))
);
