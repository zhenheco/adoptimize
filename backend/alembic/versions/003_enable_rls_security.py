# -*- coding: utf-8 -*-
"""Enable RLS and revoke anon/authenticated permissions

此 migration 啟用 Row Level Security (RLS) 並撤銷 anon/authenticated 角色的權限，
以防止 Supabase anon/authenticated key 洩漏導致的直接資料庫存取。

注意：postgres 角色（後端使用）會 bypass RLS，所以後端功能不受影響。

Revision ID: 003_enable_rls
Revises: 9ba698c5f1f0
Create Date: 2026-01-21
"""

from typing import Sequence, Union

from alembic import op

revision: str = "003_enable_rls"
down_revision: Union[str, None] = "9ba698c5f1f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# 用戶資料表格 - 啟用 RLS + 撤銷 anon/authenticated 權限
USER_DATA_TABLES = [
    "users",
    "ad_accounts",
    "notifications",
    "audience_suggestions",
    "campaigns",
    "creatives",
    "audiences",
    "health_audits",
    "recommendations",
    "ad_sets",
    "ads",
    "creative_metrics",
    "audience_metrics",
    "audit_issues",
    "action_history",
]

# 全局參考表格 - 只允許 SELECT
GLOBAL_TABLES = [
    "industry_benchmarks",
    "interest_tags",
]


def upgrade() -> None:
    """啟用 RLS 並撤銷權限"""

    # 1. 用戶資料表格 - 啟用 RLS 並撤銷 anon/authenticated 權限
    for table in USER_DATA_TABLES:
        # 啟用 RLS
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

        # 撤銷 anon/authenticated 權限
        op.execute(f"REVOKE ALL ON {table} FROM anon;")
        op.execute(f"REVOKE ALL ON {table} FROM authenticated;")

        # 確保 service_role 有完整權限
        op.execute(f"GRANT ALL ON {table} TO service_role;")

    # 2. 全局參考表格 - 只給 SELECT
    for table in GLOBAL_TABLES:
        op.execute(f"REVOKE ALL ON {table} FROM anon;")
        op.execute(f"REVOKE ALL ON {table} FROM authenticated;")
        op.execute(f"GRANT SELECT ON {table} TO anon, authenticated;")
        op.execute(f"GRANT ALL ON {table} TO service_role;")

    # 3. alembic_version - 只給 service_role
    op.execute("REVOKE ALL ON alembic_version FROM anon;")
    op.execute("REVOKE ALL ON alembic_version FROM authenticated;")
    op.execute("GRANT ALL ON alembic_version TO service_role;")


def downgrade() -> None:
    """停用 RLS 並恢復預設權限"""

    # 1. 用戶資料表格 - 停用 RLS
    for table in USER_DATA_TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

        # 恢復 anon/authenticated 的預設權限（SELECT）
        op.execute(f"GRANT SELECT ON {table} TO anon, authenticated;")

    # 2. 全局參考表格 - 恢復權限
    for table in GLOBAL_TABLES:
        op.execute(f"GRANT SELECT ON {table} TO anon, authenticated;")

    # 3. alembic_version - 恢復權限
    op.execute("GRANT SELECT ON alembic_version TO anon, authenticated;")
