# -*- coding: utf-8 -*-
"""
Celery Workers 模組

包含所有背景任務：
- sync_google: Google Ads 數據同步
- sync_meta: Meta Marketing 數據同步
"""

from app.workers.celery_app import celery_app

__all__ = ["celery_app"]
