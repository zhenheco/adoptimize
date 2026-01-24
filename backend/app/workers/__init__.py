# -*- coding: utf-8 -*-
"""
Workers 模組

包含所有背景任務：
- sync_google: Google Ads 數據同步
- sync_meta: Meta Marketing 數據同步

注意：Celery 已棄用，改用 APScheduler（詳見 app/core/scheduler.py）
"""

# 條件導入，避免在未安裝 celery 的環境中報錯
try:
    from app.workers.celery_app import celery_app
    __all__ = ["celery_app"]
except ImportError:
    celery_app = None
    __all__ = []
