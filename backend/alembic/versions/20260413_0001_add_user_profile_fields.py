"""Add user profile fields

Revision ID: 20260413_0001_profile_fields
Revises: f0a3d20cfce5
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20260413_0001_profile_fields"
down_revision = "f0a3d20cfce5"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("users")
    }

    if "full_name" not in existing_columns:
        op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))
    if "phone" not in existing_columns:
        op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    if "currency" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("currency", sa.String(length=10), nullable=True, server_default=sa.text("'INR'")),
        )
    if "profile_image_url" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("profile_image_url", sa.String(length=1024), nullable=True),
        )


def downgrade():
    connection = op.get_bind()
    existing_columns = {
        column["name"] for column in inspect(connection).get_columns("users")
    }

    if "profile_image_url" in existing_columns:
        op.drop_column("users", "profile_image_url")
    if "currency" in existing_columns:
        op.drop_column("users", "currency")
    if "phone" in existing_columns:
        op.drop_column("users", "phone")
    if "full_name" in existing_columns:
        op.drop_column("users", "full_name")
