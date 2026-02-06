# -*- coding: utf-8 -*-
"""
SQLAlchemy 資料庫基礎設定
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 嘗試建立非同步引擎
# 注意：Supabase 使用 pgbouncer（transaction mode），需要禁用 prepared statement cache
# 否則會出現「prepared statement does not exist」錯誤
try:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )

    # 建立非同步 Session 工廠
    async_session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    _db_available = True
except Exception as e:
    logger.warning(f"Database engine creation failed: {e}")
    engine = None
    async_session_maker = None
    _db_available = False


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基礎類別"""

    pass


class MockAsyncSession:
    """
    模擬的 AsyncSession，當資料庫不可用時使用
    所有查詢都會拋出特定異常，讓路由使用 mock data
    """

    async def execute(self, *args, **kwargs):
        raise DatabaseUnavailableError("Database is not available")

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def close(self):
        pass

    async def flush(self):
        pass

    def add(self, instance):
        pass


class DatabaseUnavailableError(Exception):
    """資料庫不可用異常"""
    pass


def create_worker_session_maker():
    """
    為 Celery Worker 創建新的 session maker

    Celery Worker 使用 asyncio.run() 創建新的 event loop，
    所以需要在每次調用時創建新的 engine 和 session maker。
    """
    worker_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=2,
        max_overflow=3,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
    )
    return async_sessionmaker(
        bind=worker_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def get_db() -> AsyncSession:
    """
    依賴注入：取得資料庫 Session
    使用方式：db: AsyncSession = Depends(get_db)

    當資料庫連線失敗時，返回 MockAsyncSession，
    路由應該捕獲異常並返回 mock data。

    注意：此 generator 只能 yield 一次，否則會導致
    RuntimeError: generator didn't stop after athrow()
    """
    if not _db_available or async_session_maker is None:
        logger.warning("Database not available, using mock session")
        yield MockAsyncSession()
        return

    # 分離 session 建立和 yield，避免雙重 yield bug
    try:
        session = async_session_maker()
    except Exception as e:
        logger.warning(f"Database session creation failed: {e}, using mock session")
        yield MockAsyncSession()
        return

    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
