# -*- coding: utf-8 -*-
"""初始資料庫模型

包含所有表格：users, ad_accounts, campaigns, ad_sets, ads, creatives,
creative_metrics, audiences, audience_metrics, health_audits, audit_issues,
recommendations, action_history, notifications

Revision ID: 001_initial
Revises:
Create Date: 2026-01-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === users 表 ===
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("subscription_tier", sa.String(20), nullable=False, default="STARTER"),
        sa.Column("monthly_action_count", sa.Integer, nullable=False, default=0),
        sa.Column("action_count_reset_at", sa.Date, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === ad_accounts 表 ===
    op.create_table(
        "ad_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("platform", sa.String(20), nullable=False),  # GOOGLE_ADS, META
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("currency", sa.String(10), default="TWD"),
        sa.Column("timezone", sa.String(50), default="Asia/Taipei"),
        sa.Column("access_token", sa.Text, nullable=True),
        sa.Column("refresh_token", sa.Text, nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), default="active"),  # active, paused, removed
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint("platform", "external_id", name="uq_ad_accounts_platform_external_id"),
    )

    # === campaigns 表 ===
    op.create_table(
        "campaigns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("objective", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("budget_daily", sa.Numeric(12, 2), nullable=True),
        sa.Column("budget_lifetime", sa.Numeric(12, 2), nullable=True),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("end_date", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === ad_sets 表 ===
    op.create_table(
        "ad_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("targeting", postgresql.JSONB, nullable=True),
        sa.Column("budget_daily", sa.Numeric(12, 2), nullable=True),
        sa.Column("bid_strategy", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === ads 表 ===
    op.create_table(
        "ads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_set_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_sets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === creatives 表 ===
    op.create_table(
        "creatives",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # image, video, carousel
        sa.Column("thumbnail_url", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("first_served_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === creative_metrics 表 ===
    op.create_table(
        "creative_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("creative_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("creatives.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("impressions", sa.BigInteger, default=0),
        sa.Column("clicks", sa.BigInteger, default=0),
        sa.Column("spend", sa.Numeric(12, 2), default=0),
        sa.Column("conversions", sa.Integer, default=0),
        sa.Column("revenue", sa.Numeric(12, 2), default=0),
        sa.Column("ctr", sa.Numeric(8, 4), nullable=True),
        sa.Column("cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("roas", sa.Numeric(8, 2), nullable=True),
        sa.Column("frequency", sa.Numeric(6, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("creative_id", "date", name="uq_creative_metrics_creative_date"),
    )

    # === audiences 表 ===
    op.create_table(
        "audiences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),  # custom, lookalike, interest
        sa.Column("size", sa.BigInteger, nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === audience_metrics 表 ===
    op.create_table(
        "audience_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("audience_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audiences.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("impressions", sa.BigInteger, default=0),
        sa.Column("clicks", sa.BigInteger, default=0),
        sa.Column("spend", sa.Numeric(12, 2), default=0),
        sa.Column("conversions", sa.Integer, default=0),
        sa.Column("revenue", sa.Numeric(12, 2), default=0),
        sa.Column("cpa", sa.Numeric(12, 2), nullable=True),
        sa.Column("roas", sa.Numeric(8, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("audience_id", "date", name="uq_audience_metrics_audience_date"),
    )

    # === health_audits 表 ===
    op.create_table(
        "health_audits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("overall_score", sa.Integer, nullable=False),
        sa.Column("grade", sa.String(1), nullable=False),  # A, B, C, D, F
        sa.Column("creative_score", sa.Integer, nullable=False),
        sa.Column("audience_score", sa.Integer, nullable=False),
        sa.Column("budget_score", sa.Integer, nullable=False),
        sa.Column("tracking_score", sa.Integer, nullable=False),
        sa.Column("status", sa.String(20), default="completed"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === audit_issues 表 ===
    op.create_table(
        "audit_issues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("audit_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("health_audits.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),  # CREATIVE, AUDIENCE, BUDGET, TRACKING
        sa.Column("severity", sa.String(20), nullable=False),  # CRITICAL, HIGH, MEDIUM, LOW
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("deduction", sa.Integer, nullable=False),
        sa.Column("impact_description", sa.Text, nullable=True),
        sa.Column("solution", sa.Text, nullable=True),
        sa.Column("affected_entities", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), default="open"),  # open, resolved, ignored
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === recommendations 表 ===
    op.create_table(
        "recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("issue_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("audit_issues.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("impact_score", sa.Integer, nullable=True),
        sa.Column("difficulty_score", sa.Integer, nullable=True),
        sa.Column("priority_score", sa.Integer, nullable=False),
        sa.Column("action_module", sa.String(50), nullable=True),
        sa.Column("action_params", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), default="pending"),  # pending, executed, ignored, failed
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # === action_history 表 ===
    op.create_table(
        "action_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recommendation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recommendations.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_accounts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action_type", sa.String(50), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(100), nullable=True),
        sa.Column("target_name", sa.String(255), nullable=True),
        sa.Column("old_value", postgresql.JSONB, nullable=True),
        sa.Column("new_value", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), default="completed"),  # completed, failed, rolled_back
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("rolled_back_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === notifications 表 ===
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False),  # alert, recommendation, system, info
        sa.Column("severity", sa.String(20), default="info"),  # info, warning, error, critical
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("data", postgresql.JSONB, nullable=True),
        sa.Column("is_read", sa.Boolean, default=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # === 建立額外索引 ===
    op.create_index("ix_notifications_user_is_read", "notifications", ["user_id", "is_read"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
    op.create_index("ix_recommendations_status", "recommendations", ["status"])
    op.create_index("ix_action_history_created_at", "action_history", ["created_at"])


def downgrade() -> None:
    # 按相反順序刪除表格
    op.drop_table("notifications")
    op.drop_table("action_history")
    op.drop_table("recommendations")
    op.drop_table("audit_issues")
    op.drop_table("health_audits")
    op.drop_table("audience_metrics")
    op.drop_table("audiences")
    op.drop_table("creative_metrics")
    op.drop_table("creatives")
    op.drop_table("ads")
    op.drop_table("ad_sets")
    op.drop_table("campaigns")
    op.drop_table("ad_accounts")
    op.drop_table("users")
