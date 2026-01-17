# -*- coding: utf-8 -*-
"""
SQLAlchemy 資料庫基礎設定
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# 建立非同步引擎
# 注意：Supabase 使用 pgbouncer（transaction mode），需要禁用 prepared statement cache
# 否則會出現「prepared statement does not exist」錯誤
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


class Base(DeclarativeBase):
    """SQLAlchemy ORM 基礎類別"""

    pass


async def get_db() -> AsyncSession:
    """
    依賴注入：取得資料庫 Session
    使用方式：db: AsyncSession = Depends(get_db)
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
