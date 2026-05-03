"""PostgreSQL baseline schema

Revision ID: 20260503_0001_postgresql
Revises:
Create Date: 2026-05-03
"""
from alembic import op
import sqlalchemy as sa


revision = "20260503_0001_postgresql"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=True, server_default=sa.text("'INR'")),
        sa.Column("profile_image_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "revoked_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("jti", sa.String(length=255), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_revoked_tokens_jti"), "revoked_tokens", ["jti"], unique=True)

    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=True),
        sa.Column("color", sa.String(length=10), nullable=True),
        sa.Column("icon", sa.String(length=10), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "statements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("bank_name", sa.String(length=50), nullable=True),
        sa.Column("account_number", sa.String(length=30), nullable=True),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("total_credit", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("total_debit", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_log", sa.String(length=1024), nullable=True),
        sa.CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')",
            name="ck_statements_status",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_number", "month", "year", "user_id", name="uq_statement_period"),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("statement_id", sa.Integer(), nullable=False),
        sa.Column("txn_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("debit", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("credit", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("balance", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("merchant", sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_category", "transactions", ["category"], unique=False)
    op.create_index("idx_statement_id", "transactions", ["statement_id"], unique=False)
    op.create_index("idx_txn_date", "transactions", ["txn_date"], unique=False)

    op.create_table(
        "insights",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("statement_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.CheckConstraint("type IN ('anomaly', 'pattern', 'tip')", name="ck_insights_type"),
        sa.CheckConstraint("severity IN ('info', 'warn', 'alert')", name="ck_insights_severity"),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("insights")
    op.drop_index("idx_txn_date", table_name="transactions")
    op.drop_index("idx_statement_id", table_name="transactions")
    op.drop_index("idx_category", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("statements")
    op.drop_table("categories")
    op.drop_index(op.f("ix_revoked_tokens_jti"), table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
