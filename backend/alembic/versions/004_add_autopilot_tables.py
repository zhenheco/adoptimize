# -*- coding: utf-8 -*-
"""新增自動駕駛相關資料表

新增 autopilot_logs 和 reports 表，以及 ad_accounts 的 autopilot 欄位。

Revision ID: 004_add_autopilot
Revises: 003_enable_rls
Create Date: 2026-01-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "004_add_autopilot"
down_revision: Union[str, None] = "003_enable_rls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 建立 autopilot_logs 表
    op.create_table(
        "autopilot_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ad_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action_type", sa.String(50), nullable=False, comment="動作類型: pause_ad, adjust_budget, pause_creative, boost_budget"),
        sa.Column("target_type", sa.String(50), nullable=False, comment="目標類型: campaign, ad_set, ad, creative"),
        sa.Column("target_id", sa.String(255), nullable=False, comment="外部平台的 ID"),
        sa.Column("target_name", sa.String(255), nullable=True, comment="廣告名稱（方便顯示）"),
        sa.Column("reason", sa.Text(), nullable=False, comment="白話原因"),
        sa.Column("before_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment="執行前狀態"),
        sa.Column("after_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment="執行後狀態"),
        sa.Column("estimated_savings", sa.Numeric(precision=12, scale=2), nullable=True, comment="預估節省金額"),
        sa.Column("status", sa.String(20), nullable=False, server_default="executed", comment="狀態: executed, pending, failed"),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="執行時間"),
        sa.ForeignKeyConstraint(["ad_account_id"], ["ad_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_autopilot_logs_account", "autopilot_logs", ["ad_account_id"])
    op.create_index("idx_autopilot_logs_executed_at", "autopilot_logs", ["executed_at"])

    # 建立 reports 表
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("report_type", sa.String(20), nullable=False, comment="報告類型: daily, weekly, monthly"),
        sa.Column("period_start", sa.Date(), nullable=False, comment="報告期間開始"),
        sa.Column("period_end", sa.Date(), nullable=False, comment="報告期間結束"),
        sa.Column("content", postgresql.JSONB(astext_type=sa.Text()), nullable=False, comment="結構化數據"),
        sa.Column("content_text", sa.Text(), nullable=True, comment="白話文字版（AI 生成）"),
        sa.Column("sent_via", sa.String(20), nullable=True, comment="發送管道: line, email, web"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True, comment="發送時間"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="建立時間"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_reports_user", "reports", ["user_id"])
    op.create_index("idx_reports_type_period", "reports", ["report_type", "period_start"])

    # 在 ad_accounts 新增 autopilot 欄位
    op.add_column(
        "ad_accounts",
        sa.Column("autopilot_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="是否啟用自動駕駛"),
    )
    op.add_column(
        "ad_accounts",
        sa.Column("autopilot_settings", postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment="自動駕駛設定"),
    )

    # 對新表啟用 RLS（與 003 migration 保持一致）
    op.execute("ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE reports ENABLE ROW LEVEL SECURITY")

    # 撤銷 anon/authenticated 對新表的權限
    op.execute("REVOKE ALL ON autopilot_logs FROM anon, authenticated")
    op.execute("REVOKE ALL ON reports FROM anon, authenticated")


def downgrade() -> None:
    # 移除 RLS
    op.execute("ALTER TABLE autopilot_logs DISABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE reports DISABLE ROW LEVEL SECURITY")

    # 移除 ad_accounts 的 autopilot 欄位
    op.drop_column("ad_accounts", "autopilot_settings")
    op.drop_column("ad_accounts", "autopilot_enabled")

    # 刪除索引和表
    op.drop_index("idx_reports_type_period", table_name="reports")
    op.drop_index("idx_reports_user", table_name="reports")
    op.drop_table("reports")

    op.drop_index("idx_autopilot_logs_executed_at", table_name="autopilot_logs")
    op.drop_index("idx_autopilot_logs_account", table_name="autopilot_logs")
    op.drop_table("autopilot_logs")
