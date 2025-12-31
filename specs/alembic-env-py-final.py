# -*- coding: utf-8 -*-
"""
Alembic 環境設定

支援非同步 SQLAlchemy 引擎的 migration 設定

INSTRUCTION: Copy this file to backend/alembic/env.py
Run: cp specs/alembic-env-py-final.py backend/alembic/env.py
"""

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.db.base import Base
from app.models import *  # noqa: F401, F403

# 載入環境變數
load_dotenv()

# Alembic 設定物件
config = context.config

# 設定 Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLAlchemy 模型 metadata
target_metadata = Base.metadata


def get_url() -> str:
    """
    取得資料庫 URL

    從環境變數讀取，自動轉換為 asyncpg 驅動程式格式
    """
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize",
    )
    # 確保使用 asyncpg 驅動程式
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url.strip()


def run_migrations_offline() -> None:
    """
    離線模式執行 migrations

    不需要資料庫連線，只產生 SQL 指令
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """
    執行 migrations 的同步函式

    由 run_sync 呼叫，在同步 context 中執行
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    非同步執行 migrations

    建立非同步引擎，透過 run_sync 執行同步 migration
    """
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    線上模式執行 migrations

    使用非同步引擎連接資料庫執行 migrations
    """
    asyncio.run(run_async_migrations())


# 根據模式執行 migrations
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
