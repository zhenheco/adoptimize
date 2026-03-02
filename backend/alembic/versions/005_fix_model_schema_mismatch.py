# -*- coding: utf-8 -*-
"""修復 Model 與 DB Schema 不一致

1. health_audits: 新增 structure_score, issues_count 欄位；score 欄位改 nullable
2. creatives: status 欄位改為 nullable（與 Model 一致）

Revision ID: 005_fix_schema
Revises: 62f714b8a14b
Create Date: 2026-03-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_fix_schema"
down_revision: Union[str, None] = "62f714b8a14b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === health_audits: 新增欄位 ===
    op.add_column(
        "health_audits",
        sa.Column("structure_score", sa.Integer, nullable=True, comment="帳戶結構分數: 0-100"),
    )
    op.add_column(
        "health_audits",
        sa.Column("issues_count", sa.Integer, nullable=False, server_default="0"),
    )

    # === health_audits: score 欄位改 nullable ===
    op.alter_column("health_audits", "overall_score", existing_type=sa.Integer, nullable=True)
    op.alter_column("health_audits", "grade", existing_type=sa.String(1), nullable=True)
    op.alter_column("health_audits", "creative_score", existing_type=sa.Integer, nullable=True)
    op.alter_column("health_audits", "audience_score", existing_type=sa.Integer, nullable=True)
    op.alter_column("health_audits", "budget_score", existing_type=sa.Integer, nullable=True)
    op.alter_column("health_audits", "tracking_score", existing_type=sa.Integer, nullable=True)

    # === creatives: status 改 nullable ===
    op.alter_column("creatives", "status", existing_type=sa.String(50), nullable=True)


def downgrade() -> None:
    # === creatives: status 改回 NOT NULL ===
    op.alter_column("creatives", "status", existing_type=sa.String(50), nullable=False)

    # === health_audits: score 欄位改回 NOT NULL ===
    op.alter_column("health_audits", "tracking_score", existing_type=sa.Integer, nullable=False)
    op.alter_column("health_audits", "budget_score", existing_type=sa.Integer, nullable=False)
    op.alter_column("health_audits", "audience_score", existing_type=sa.Integer, nullable=False)
    op.alter_column("health_audits", "creative_score", existing_type=sa.Integer, nullable=False)
    op.alter_column("health_audits", "grade", existing_type=sa.String(1), nullable=False)
    op.alter_column("health_audits", "overall_score", existing_type=sa.Integer, nullable=False)

    # === health_audits: 移除新增欄位 ===
    op.drop_column("health_audits", "issues_count")
    op.drop_column("health_audits", "structure_score")
