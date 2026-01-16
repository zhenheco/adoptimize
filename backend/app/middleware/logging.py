# -*- coding: utf-8 -*-
"""
日誌中間件

提供結構化日誌和請求追蹤功能
- AC-A3: 日誌包含 trace_id 可追蹤完整請求鏈路
"""

import json
import logging
import sys
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


# ============================================================================
# Trace ID 上下文管理
# ============================================================================

_trace_id_var: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)


def get_trace_id() -> Optional[str]:
    """取得當前請求的 trace_id"""
    return _trace_id_var.get()


def set_trace_id(trace_id: str) -> None:
    """設定當前請求的 trace_id"""
    _trace_id_var.set(trace_id)


def clear_trace_id() -> None:
    """清除當前請求的 trace_id"""
    _trace_id_var.set(None)


# ============================================================================
# 結構化日誌記錄器
# ============================================================================


class StructuredLogger:
    """
    結構化 JSON 日誌記錄器

    自動包含 trace_id 和標準欄位
    """

    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)

    def _format_log(self, level: str, message: str, **kwargs: Any) -> str:
        """格式化為 JSON 結構"""
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "logger": self.name,
            "message": message,
            "trace_id": get_trace_id(),
            **kwargs,
        }
        return json.dumps(log_data, ensure_ascii=False, default=str)

    def debug(self, message: str, **kwargs: Any) -> None:
        """記錄 DEBUG 等級日誌"""
        self.logger.debug(self._format_log("DEBUG", message, **kwargs))

    def info(self, message: str, **kwargs: Any) -> None:
        """記錄 INFO 等級日誌"""
        self.logger.info(self._format_log("INFO", message, **kwargs))

    def warning(self, message: str, **kwargs: Any) -> None:
        """記錄 WARNING 等級日誌"""
        self.logger.warning(self._format_log("WARNING", message, **kwargs))

    def error(self, message: str, **kwargs: Any) -> None:
        """記錄 ERROR 等級日誌"""
        self.logger.error(self._format_log("ERROR", message, **kwargs))

    def exception(self, message: str, **kwargs: Any) -> None:
        """記錄 ERROR 等級日誌，包含例外堆疊"""
        exc_info = traceback.format_exc()
        self.logger.error(
            self._format_log("ERROR", message, exception=exc_info, **kwargs)
        )


# 全域 logger 實例
logger = StructuredLogger("adoptimize")


# ============================================================================
# 日誌中間件
# ============================================================================


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    請求日誌中間件

    - 為每個請求設定唯一 trace_id
    - 記錄請求和回應資訊
    - 回應 header 包含 X-Trace-ID
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # 取得或生成 trace_id
        incoming_trace_id = request.headers.get("X-Trace-ID")
        trace_id = incoming_trace_id or str(uuid.uuid4())
        set_trace_id(trace_id)

        # 記錄請求開始
        start_time = time.time()
        logger.info(
            "Request started",
            method=request.method,
            path=str(request.url.path),
            query_params=str(request.query_params),
        )

        try:
            # 處理請求
            response = await call_next(request)

            # 計算處理時間
            duration_ms = (time.time() - start_time) * 1000

            # 記錄回應
            logger.info(
                "Request completed",
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2),
            )

            # 回應 header 加入 trace_id
            response.headers["X-Trace-ID"] = trace_id

            return response

        except Exception as e:
            # 計算處理時間
            duration_ms = (time.time() - start_time) * 1000

            # 記錄錯誤
            logger.error(
                "Request failed",
                method=request.method,
                path=str(request.url.path),
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=round(duration_ms, 2),
            )

            # 重新拋出讓 FastAPI 處理
            raise

        finally:
            # 清除 trace_id
            clear_trace_id()


# ============================================================================
# 配置函數
# ============================================================================


def setup_logging(level: str = "INFO") -> None:
    """
    配置日誌系統

    Args:
        level: 日誌等級（DEBUG, INFO, WARNING, ERROR）
    """
    # 設定根 logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # 移除現有 handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 新增 stdout handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger.addHandler(handler)

    # 設定 app logger
    app_logger = logging.getLogger("adoptimize")
    app_logger.setLevel(getattr(logging, level.upper()))
