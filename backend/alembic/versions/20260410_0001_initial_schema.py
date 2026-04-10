"""Initial schema

Revision ID: 20260410_0001_initial
Revises: 
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260410_0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True),
        sa.Column("keywords", sa.JSON(), nullable=True),
        sa.Column("color", sa.String(length=10), nullable=True),
        sa.Column("icon", sa.String(length=10), nullable=True),
    )

    op.create_table(
        "statements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("bank_name", sa.String(length=50), nullable=False),
        sa.Column("account_number", sa.String(length=30), nullable=True),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("total_credit", sa.Numeric(precision=12, scale=2), server_default=sa.text("0")),
        sa.Column("total_debit", sa.Numeric(precision=12, scale=2), server_default=sa.text("0")),
        sa.UniqueConstraint(
            "bank_name",
            "account_number",
            "month",
            "year",
            name="uq_statement_period",
        ),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "statement_id",
            sa.Integer(),
            sa.ForeignKey("statements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("txn_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("debit", sa.Numeric(precision=12, scale=2), server_default=sa.text("0")),
        sa.Column("credit", sa.Numeric(precision=12, scale=2), server_default=sa.text("0")),
        sa.Column("balance", sa.Numeric(precision=14, scale=2), server_default=sa.text("0")),
        sa.Column("category", sa.String(length=50), server_default=sa.text("'Uncategorized'")),
        sa.Column("merchant", sa.String(length=100), nullable=True),
    )

    op.create_index("idx_txn_date", "transactions", ["txn_date"])
    op.create_index("idx_category", "transactions", ["category"])
    op.create_index("idx_statement_id", "transactions", ["statement_id"])

    op.create_table(
        "insights",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "statement_id",
            sa.Integer(),
            sa.ForeignKey("statements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            sa.Enum("anomaly", "pattern", "tip", name="insight_type"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column(
            "severity",
            sa.Enum("info", "warn", "alert", name="insight_severity"),
            nullable=False,
            server_default=sa.text("'info'"),
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("insights")

    op.drop_index("idx_statement_id", table_name="transactions")
    op.drop_index("idx_category", table_name="transactions")
    op.drop_index("idx_txn_date", table_name="transactions")
    op.drop_table("transactions")

    op.drop_table("statements")
    op.drop_table("categories")
