# Backend Setup Instructions

This document contains the code that needs to be manually added to complete the backend setup.

## 1. Alembic Configuration

### File: `backend/alembic.ini`

```ini
# Alembic Configuration File

[alembic]
script_location = alembic
prepend_sys_path = .
version_locations = %(here)s/alembic/versions
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

### File: `backend/alembic/env.py`

```python
# -*- coding: utf-8 -*-
"""
Alembic 環境設定
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.db.base import Base
from app.models import *  # noqa: F401, F403

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    import os
    from dotenv import load_dotenv
    load_dotenv()
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize",
    )
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def run_migrations_offline() -> None:
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
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
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
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

---

## 2. Docker Compose

### File: `docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: adoptimize-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: adoptimize
      POSTGRES_PASSWORD: password
      POSTGRES_DB: adoptimize
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adoptimize"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: adoptimize-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    name: adoptimize-postgres-data
  redis_data:
    name: adoptimize-redis-data
```

---

## 3. Environment Templates

### File: `backend/.env.example`

```bash
# Database
DATABASE_URL=postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize

# Redis
REDIS_URL=redis://localhost:6379

# App Settings
DEBUG=true
APP_NAME=AdOptimize
API_V1_PREFIX=/api/v1

# Google Ads API
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_REFRESH_TOKEN=

# Meta Marketing API
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
```

---

## 4. Redis Service

### File: `backend/app/services/redis_client.py`

```python
# -*- coding: utf-8 -*-
"""
Redis 客戶端服務
"""

from functools import lru_cache
from typing import Optional

import redis.asyncio as redis

from app.core.config import get_settings


class RedisClient:
    """Redis 客戶端封裝"""

    def __init__(self):
        self._pool: Optional[redis.ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """建立 Redis 連線"""
        settings = get_settings()
        self._pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        self._client = redis.Redis(connection_pool=self._pool)

    async def disconnect(self) -> None:
        """關閉 Redis 連線"""
        if self._client:
            await self._client.close()
        if self._pool:
            await self._pool.disconnect()

    @property
    def client(self) -> redis.Redis:
        """取得 Redis 客戶端"""
        if not self._client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        return self._client

    async def get(self, key: str) -> Optional[str]:
        """取得快取值"""
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None,
    ) -> bool:
        """設定快取值"""
        return await self.client.set(key, value, ex=expire)

    async def delete(self, key: str) -> int:
        """刪除快取值"""
        return await self.client.delete(key)

    async def ping(self) -> bool:
        """測試連線"""
        try:
            return await self.client.ping()
        except Exception:
            return False


@lru_cache
def get_redis_client() -> RedisClient:
    """取得 Redis 客戶端單例"""
    return RedisClient()
```

---

## 5. Celery Worker

### File: `backend/app/workers/celery_app.py`

```python
# -*- coding: utf-8 -*-
"""
Celery 應用程式設定
"""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "adoptimize",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
    include=[
        "app.workers.sync_google",
        "app.workers.sync_meta",
    ],
)

# Celery 設定
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分鐘
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# 排程任務 (Celery Beat)
celery_app.conf.beat_schedule = {
    "sync-google-ads-every-15-minutes": {
        "task": "app.workers.sync_google.sync_all_accounts",
        "schedule": 15 * 60,  # 每 15 分鐘
    },
    "sync-meta-ads-every-15-minutes": {
        "task": "app.workers.sync_meta.sync_all_accounts",
        "schedule": 15 * 60,  # 每 15 分鐘
    },
}
```

### File: `backend/app/workers/sync_google.py`

```python
# -*- coding: utf-8 -*-
"""
Google Ads 數據同步 Worker
"""

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.sync_google.sync_all_accounts")
def sync_all_accounts():
    """同步所有 Google Ads 帳戶"""
    # TODO: 實作 Google Ads 數據同步
    pass


@celery_app.task(name="app.workers.sync_google.sync_account")
def sync_account(account_id: str):
    """同步單一 Google Ads 帳戶"""
    # TODO: 實作單一帳戶同步
    pass
```

### File: `backend/app/workers/sync_meta.py`

```python
# -*- coding: utf-8 -*-
"""
Meta Marketing 數據同步 Worker
"""

from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.sync_meta.sync_all_accounts")
def sync_all_accounts():
    """同步所有 Meta Ads 帳戶"""
    # TODO: 實作 Meta Ads 數據同步
    pass


@celery_app.task(name="app.workers.sync_meta.sync_account")
def sync_account(account_id: str):
    """同步單一 Meta Ads 帳戶"""
    # TODO: 實作單一帳戶同步
    pass
```

---

## 6. Tests

### File: `backend/tests/conftest.py`

```python
# -*- coding: utf-8 -*-
"""
Pytest 共用 fixtures
"""

import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base, get_db
from app.main import app

# 測試用資料庫 URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_async_session = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """建立 event loop"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """建立測試用資料庫 session"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_async_session() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """建立測試用 HTTP 客戶端"""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
```

### File: `backend/tests/unit/test_health.py`

```python
# -*- coding: utf-8 -*-
"""
健康檢查端點測試
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """測試健康檢查端點回傳正確格式"""
    response = await client.get("/api/health")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """測試根路徑端點"""
    response = await client.get("/")

    assert response.status_code == 200

    data = response.json()
    assert "message" in data
    assert "docs" in data
    assert "health" in data
```

---

## 7. Running the Backend

```bash
# 1. Start Docker services
docker-compose -f docker/docker-compose.yml up -d

# 2. Create virtual environment and install dependencies
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# 3. Copy environment file
cp .env.example .env

# 4. Run database migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 5. Start FastAPI server
uvicorn app.main:app --reload --port 8000

# 6. Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info

# 7. Start Celery beat scheduler (separate terminal)
celery -A app.workers.celery_app beat --loglevel=info
```

---

## ✅ Setup Verification

After completing the setup, verify:

1. **Health endpoint**: `curl http://localhost:8000/api/health` returns 200
2. **API docs**: Visit `http://localhost:8000/docs`
3. **Database**: Tables created with `alembic upgrade head`
4. **Redis**: Connection works (test with `redis-cli ping`)
5. **Celery**: Worker starts without errors
