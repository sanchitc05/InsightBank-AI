"""Add user_id to statements

Revision ID: 2e773595c90a
Revises: c23350bf0860
Create Date: 2026-04-12 11:58:26.009940

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e773595c90a'
down_revision: Union[str, None] = 'c23350bf0860'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add column nullable=True
    op.add_column('statements', sa.Column('user_id', sa.Integer(), nullable=True))
    
    # 2. Fill back legacy user
    # Handle DB abstraction gracefully (won't crash if users exist, but basic execute should work)
    op.execute("INSERT INTO users (email, hashed_password) VALUES ('legacy@insightbank.local', 'MIGRATION_MOCK_HASH')")
    op.execute("UPDATE statements SET user_id = (SELECT id FROM users WHERE email='legacy@insightbank.local')")
    
    # 3. Apply constraints via batch_alter_table for SQLite compatibility
    with op.batch_alter_table('statements', schema=None) as batch_op:
        batch_op.alter_column('user_id', existing_type=sa.Integer(), nullable=False)
        batch_op.drop_constraint('uq_statement_period', type_='unique')
        batch_op.create_unique_constraint('uq_statement_period', ['bank_name', 'account_number', 'month', 'year', 'user_id'])
        batch_op.create_foreign_key('fk_statement_user', 'users', ['user_id'], ['id'], ondelete='CASCADE')

def downgrade() -> None:
    with op.batch_alter_table('statements', schema=None) as batch_op:
        batch_op.drop_constraint('fk_statement_user', type_='foreignkey')
        batch_op.drop_constraint('uq_statement_period', type_='unique')
        batch_op.create_unique_constraint('uq_statement_period', ['bank_name', 'account_number', 'month', 'year'])
        batch_op.drop_column('user_id')
    
    op.execute("DELETE FROM users WHERE email='legacy@insightbank.local'")
