"""add_oauth_fields_to_users

Revision ID: 9ba698c5f1f0
Revises: 002_add_suggestion
Create Date: 2026-01-19 17:09:23.263490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9ba698c5f1f0'
down_revision: Union[str, None] = '002_add_suggestion'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加 oauth_provider 和 oauth_id 欄位到 users 表
    op.add_column('users', sa.Column('oauth_provider', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('oauth_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # 移除 oauth_provider 和 oauth_id 欄位
    op.drop_column('users', 'oauth_id')
    op.drop_column('users', 'oauth_provider')
