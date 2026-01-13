# -*- coding: utf-8 -*-
"""新增智慧受眾建議相關表格

新增表格：
- industry_benchmarks: 產業基準數據
- interest_tags: Meta 興趣標籤主檔
- audience_suggestions: AI 受眾建議記錄

修改表格：
- users: 新增 monthly_suggestion_count, suggestion_count_reset_at 欄位

Revision ID: 002_add_suggestion
Revises: 001_initial
Create Date: 2026-01-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_add_suggestion"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === industry_benchmarks 表 ===
    op.create_table(
        "industry_benchmarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("industry_code", sa.String(50), nullable=False, index=True),
        sa.Column("industry_name", sa.String(100), nullable=False),
        sa.Column("objective_code", sa.String(50), nullable=False, index=True),
        sa.Column("objective_name", sa.String(100), nullable=False),
        sa.Column("avg_cpa", sa.Numeric(15, 2), nullable=True),
        sa.Column("avg_roas", sa.Numeric(10, 4), nullable=True),
        sa.Column("avg_ctr", sa.Numeric(10, 6), nullable=True),
        sa.Column("avg_cpc", sa.Numeric(15, 2), nullable=True),
        sa.Column("avg_cpm", sa.Numeric(15, 2), nullable=True),
        sa.Column("sample_size", sa.Integer, nullable=True),
        sa.Column("data_period", sa.String(50), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "industry_code", "objective_code", name="uq_industry_objective"
        ),
        comment="產業基準數據表",
    )

    # === interest_tags 表 ===
    op.create_table(
        "interest_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "meta_interest_id", sa.String(50), nullable=False, unique=True, index=True
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("name_zh", sa.String(255), nullable=True),
        sa.Column("path", sa.String(500), nullable=True),
        sa.Column("category", sa.String(100), nullable=True, index=True),
        sa.Column("audience_size_lower", sa.BigInteger, nullable=True),
        sa.Column("audience_size_upper", sa.BigInteger, nullable=True),
        sa.Column("industry_relevance", postgresql.JSONB, nullable=True),
        sa.Column("objective_relevance", postgresql.JSONB, nullable=True),
        sa.Column("description", sa.String(1000), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        comment="Meta 興趣標籤主檔",
    )

    # === audience_suggestions 表 ===
    op.create_table(
        "audience_suggestions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        # 輸入參數
        sa.Column("industry_code", sa.String(50), nullable=False),
        sa.Column("objective_code", sa.String(50), nullable=False),
        sa.Column("additional_context", sa.Text, nullable=True),
        # AI 生成的建議
        sa.Column("suggested_interests", postgresql.JSONB, nullable=False),
        sa.Column("reasoning", sa.Text, nullable=True),
        sa.Column("budget_allocation", postgresql.JSONB, nullable=True),
        sa.Column("creative_recommendations", postgresql.JSONB, nullable=True),
        sa.Column("suggested_ad_copy", sa.Text, nullable=True),
        # 預估成效
        sa.Column("estimated_reach_lower", sa.BigInteger, nullable=True),
        sa.Column("estimated_reach_upper", sa.BigInteger, nullable=True),
        sa.Column("estimated_cpa", sa.Numeric(15, 2), nullable=True),
        sa.Column("estimated_roas", sa.Numeric(10, 4), nullable=True),
        sa.Column("confidence_score", sa.Numeric(5, 4), nullable=True),
        # 執行狀態
        sa.Column(
            "status", sa.String(50), nullable=False, default="generated", index=True
        ),
        sa.Column("meta_audience_id", sa.String(255), nullable=True),
        sa.Column("meta_adset_id", sa.String(255), nullable=True),
        sa.Column("meta_ad_id", sa.String(255), nullable=True),
        # 元數據
        sa.Column("ai_model_version", sa.String(50), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        comment="AI 受眾建議記錄表",
    )

    # === 修改 users 表，新增建議次數欄位 ===
    op.add_column(
        "users",
        sa.Column(
            "monthly_suggestion_count",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "suggestion_count_reset_at",
            sa.Date,
            nullable=False,
            server_default=sa.func.current_date(),
        ),
    )


def downgrade() -> None:
    # 移除 users 表的新欄位
    op.drop_column("users", "suggestion_count_reset_at")
    op.drop_column("users", "monthly_suggestion_count")

    # 刪除新表格
    op.drop_table("audience_suggestions")
    op.drop_table("interest_tags")
    op.drop_table("industry_benchmarks")
