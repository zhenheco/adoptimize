# -*- coding: utf-8 -*-
"""
Celery 應用程式設定

此模組設定 Celery 的：
- Broker 和 Backend（預設使用 Redis）
- 任務序列化和時區設定
- 排程任務（每 15 分鐘同步數據）
"""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()


def _get_redis_url_with_ssl(url: str) -> str:
    """
    為 rediss:// URL 添加 SSL 參數

    Upstash Redis 使用 TLS，Celery 需要明確指定 ssl_cert_reqs 參數
    """
    if url.startswith("rediss://"):
        # 如果 URL 已經有參數，使用 & 分隔；否則使用 ?
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}ssl_cert_reqs=CERT_NONE"
    return url


# 處理 Redis URL 的 SSL 設定
broker_url = _get_redis_url_with_ssl(settings.celery_broker)
backend_url = _get_redis_url_with_ssl(settings.celery_backend)

# 建立 Celery 應用程式
celery_app = Celery(
    "adoptimize",
    broker=broker_url,
    backend=backend_url,
    include=[
        "app.workers.sync_google",
        "app.workers.sync_meta",
        "app.workers.run_health_audit",
        "app.workers.billing_tasks",
    ],
)

# Celery 設定
celery_app.conf.update(
    # 序列化設定
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # 時區設定
    timezone="UTC",
    enable_utc=True,
    # 任務追蹤設定
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 分鐘超時
    # Worker 設定
    worker_prefetch_multiplier=1,  # 一次只取一個任務
    task_acks_late=True,  # 任務完成後才確認
    # 重試設定
    task_default_retry_delay=60,  # 預設重試延遲 60 秒
    task_max_retries=3,  # 最多重試 3 次
)

# 排程任務（Celery Beat）
# 每 15 分鐘同步一次 Google 和 Meta 廣告數據
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "sync-google-ads-every-15-minutes": {
        "task": "app.workers.sync_google.sync_all_accounts",
        "schedule": 15 * 60,  # 每 15 分鐘
    },
    "sync-meta-ads-every-15-minutes": {
        "task": "app.workers.sync_meta.sync_all_accounts",
        "schedule": 15 * 60,  # 每 15 分鐘
    },
    # 計費相關任務
    "charge-monthly-fees": {
        "task": "app.workers.billing_tasks.charge_monthly_fees",
        "schedule": crontab(day_of_month="1", hour="0", minute="30"),  # 每月 1 日 00:30
    },
    "reset-monthly-quotas": {
        "task": "app.workers.billing_tasks.reset_monthly_quotas",
        "schedule": crontab(day_of_month="1", hour="0", minute="0"),  # 每月 1 日 00:00
    },
}
