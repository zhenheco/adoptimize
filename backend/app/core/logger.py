# -*- coding: utf-8 -*-
"""
統一日誌服務

提供結構化日誌輸出，在開發和生產環境使用一致的格式
"""

import logging
import sys
from typing import Optional

from .config import get_settings

settings = get_settings()

# 設定日誌格式
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging() -> None:
    """初始化日誌設定"""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # 配置根日誌器
    logging.basicConfig(
        level=log_level,
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # 降低第三方庫的日誌級別
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    取得日誌器

    Args:
        name: 日誌器名稱（通常使用 __name__）

    Returns:
        已配置的日誌器

    Example:
        ```python
        from app.core.logger import get_logger

        logger = get_logger(__name__)
        logger.info("處理請求", extra={"user_id": "123"})
        logger.error("發生錯誤", exc_info=True)
        ```
    """
    return logging.getLogger(name or "adoptimize")


# 預設日誌器
logger = get_logger("adoptimize")
