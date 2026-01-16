# -*- coding: utf-8 -*-
"""
Pytest 配置與共用 fixtures

使用 SQLite 作為測試資料庫，並處理 PostgreSQL 特定類型的相容性。
"""

import asyncio
import uuid
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from sqlalchemy import String, TypeDecorator, event
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base


# 使用 SQLite 作為測試資料庫（in-memory）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


class SQLiteUUID(TypeDecorator):
    """在 SQLite 中將 UUID 存儲為字串"""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return None


def _setup_sqlite_compatibility():
    """設定 SQLite 與 PostgreSQL 類型的相容性"""
    from sqlalchemy import JSON

    for table in Base.metadata.tables.values():
        for column in table.columns:
            # UUID -> String(36) 透過 TypeDecorator
            if isinstance(column.type, PG_UUID):
                column.type = SQLiteUUID()
            # JSONB -> JSON
            elif isinstance(column.type, JSONB):
                column.type = JSON()


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """創建事件循環供整個測試會話使用"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """創建測試用的 async engine"""
    # 設定類型相容性
    _setup_sqlite_compatibility()

    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """創建測試用的資料庫 session"""
    async_session_factory = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_meta_api_response():
    """Mock Meta API 回應的 fixture"""
    return {
        "data": [
            {
                "id": "123456789",
                "name": "Test Campaign",
                "status": "ACTIVE",
                "objective": "CONVERSIONS",
                "daily_budget": "10000",
            }
        ],
        "paging": {
            "cursors": {
                "before": "abc",
                "after": "xyz"
            }
        }
    }


@pytest.fixture
def mock_meta_rate_limit_response():
    """Mock Meta API Rate Limit 回應"""
    return {
        "error": {
            "message": "User request limit reached",
            "type": "OAuthException",
            "code": 17,
            "fbtrace_id": "test_trace_id"
        }
    }


@pytest.fixture
def mock_meta_token_expired_response():
    """Mock Meta API Token 過期回應"""
    return {
        "error": {
            "message": "Error validating access token",
            "type": "OAuthException",
            "code": 190,
            "error_subcode": 463,
            "fbtrace_id": "test_trace_id"
        }
    }
