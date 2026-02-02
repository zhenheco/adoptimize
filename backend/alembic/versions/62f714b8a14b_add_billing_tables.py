"""add_billing_tables

Revision ID: 62f714b8a14b
Revises: 004_add_autopilot
Create Date: 2026-02-02 17:30:20.152590

新增計費系統相關表:
- subscriptions: 訂閱方案
- wallets: 錢包餘額
- wallet_transactions: 交易紀錄
- billable_actions: 計費操作

金額使用 TWD 整數，費率使用千分比（如 1000 = 10%）
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '62f714b8a14b'
down_revision: Union[str, None] = '004_add_autopilot'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 建立 subscriptions 表 - 訂閱方案
    op.create_table('subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False, comment='用戶 ID'),
        sa.Column('plan', sa.String(length=20), nullable=False, server_default='free', comment='訂閱方案: free, pro, agency'),
        sa.Column('monthly_fee', sa.Integer(), nullable=False, server_default='0', comment='月費 (TWD 整數)'),
        sa.Column('commission_rate', sa.Integer(), nullable=False, server_default='1000', comment='抽成費率 (千分比，如 1000 = 10%)'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='訂閱開始時間'),
        sa.Column('next_billing_date', sa.Date(), nullable=True, comment='下次扣款日期'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', comment='是否啟用'),
        sa.Column('monthly_copywriting_quota', sa.Integer(), nullable=False, server_default='0', comment='每月文案生成配額'),
        sa.Column('monthly_image_quota', sa.Integer(), nullable=False, server_default='0', comment='每月圖片生成配額'),
        sa.Column('monthly_copywriting_used', sa.Integer(), nullable=False, server_default='0', comment='本月文案生成已使用次數'),
        sa.Column('monthly_image_used', sa.Integer(), nullable=False, server_default='0', comment='本月圖片生成已使用次數'),
        sa.Column('quota_reset_at', sa.Date(), nullable=True, comment='配額重置日期'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='建立時間'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='更新時間'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=True)

    # 建立 wallets 表 - 錢包餘額
    op.create_table('wallets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False, comment='用戶 ID'),
        sa.Column('balance', sa.Integer(), nullable=False, server_default='0', comment='餘額 (TWD 整數)'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='建立時間'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='更新時間'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wallets_user_id'), 'wallets', ['user_id'], unique=True)

    # 建立 wallet_transactions 表 - 交易紀錄
    op.create_table('wallet_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('wallet_id', sa.UUID(), nullable=False, comment='錢包 ID'),
        sa.Column('type', sa.String(length=50), nullable=False, comment='交易類型: deposit, subscription_fee, action_fee, ai_audience, ai_copywriting, ai_image, refund'),
        sa.Column('amount', sa.Integer(), nullable=False, comment='金額 (正值=入帳，負值=扣款，TWD 整數)'),
        sa.Column('balance_after', sa.Integer(), nullable=False, comment='交易後餘額 (TWD 整數)'),
        sa.Column('description', sa.String(length=500), nullable=False, comment='交易描述'),
        sa.Column('reference_id', sa.String(length=100), nullable=True, comment='關聯 ID (如 BillableAction ID)'),
        sa.Column('reference_type', sa.String(length=50), nullable=True, comment='關聯類型 (如 billable_action, subscription)'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='額外資訊'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='建立時間'),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wallet_transactions_created_at'), 'wallet_transactions', ['created_at'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_type'), 'wallet_transactions', ['type'], unique=False)
    op.create_index(op.f('ix_wallet_transactions_wallet_id'), 'wallet_transactions', ['wallet_id'], unique=False)

    # 建立 billable_actions 表 - 計費操作
    op.create_table('billable_actions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False, comment='用戶 ID'),
        sa.Column('action_history_id', sa.UUID(), nullable=True, comment='操作歷史記錄 ID'),
        sa.Column('action_type', sa.String(length=50), nullable=False, comment='操作類型: CREATE_CAMPAIGN, CREATE_ADSET, CREATE_AD, UPDATE_BUDGET, DUPLICATE_CAMPAIGN'),
        sa.Column('platform', sa.String(length=20), nullable=False, comment='廣告平台: google, meta, tiktok, linkedin, reddit, line'),
        sa.Column('ad_spend_amount', sa.Integer(), nullable=False, comment='廣告花費金額 (TWD 整數)'),
        sa.Column('commission_rate', sa.Integer(), nullable=False, comment='抽成費率 (千分比，如 1000 = 10%)'),
        sa.Column('commission_amount', sa.Integer(), nullable=False, comment='抽成金額 (TWD 整數)'),
        sa.Column('is_billed', sa.Boolean(), nullable=False, server_default='false', comment='是否已計費'),
        sa.Column('billed_at', sa.DateTime(timezone=True), nullable=True, comment='計費時間'),
        sa.Column('transaction_id', sa.UUID(), nullable=True, comment='關聯的錢包交易 ID'),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='額外資訊'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='建立時間'),
        sa.ForeignKeyConstraint(['action_history_id'], ['action_history.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_billable_actions_action_type'), 'billable_actions', ['action_type'], unique=False)
    op.create_index(op.f('ix_billable_actions_created_at'), 'billable_actions', ['created_at'], unique=False)
    op.create_index(op.f('ix_billable_actions_is_billed'), 'billable_actions', ['is_billed'], unique=False)
    op.create_index(op.f('ix_billable_actions_platform'), 'billable_actions', ['platform'], unique=False)
    op.create_index(op.f('ix_billable_actions_user_id'), 'billable_actions', ['user_id'], unique=False)


def downgrade() -> None:
    # 刪除 billable_actions 表
    op.drop_index(op.f('ix_billable_actions_user_id'), table_name='billable_actions')
    op.drop_index(op.f('ix_billable_actions_platform'), table_name='billable_actions')
    op.drop_index(op.f('ix_billable_actions_is_billed'), table_name='billable_actions')
    op.drop_index(op.f('ix_billable_actions_created_at'), table_name='billable_actions')
    op.drop_index(op.f('ix_billable_actions_action_type'), table_name='billable_actions')
    op.drop_table('billable_actions')

    # 刪除 wallet_transactions 表
    op.drop_index(op.f('ix_wallet_transactions_wallet_id'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_type'), table_name='wallet_transactions')
    op.drop_index(op.f('ix_wallet_transactions_created_at'), table_name='wallet_transactions')
    op.drop_table('wallet_transactions')

    # 刪除 wallets 表
    op.drop_index(op.f('ix_wallets_user_id'), table_name='wallets')
    op.drop_table('wallets')

    # 刪除 subscriptions 表
    op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    op.drop_table('subscriptions')
