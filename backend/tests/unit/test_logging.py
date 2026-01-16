# -*- coding: utf-8 -*-
"""
日誌中間件測試

測試驗收標準：
- AC-A3: 日誌包含 trace_id 可追蹤完整請求鏈路
"""

import json
import logging
import uuid
from io import StringIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.logging import (
    LoggingMiddleware,
    StructuredLogger,
    get_trace_id,
    set_trace_id,
    clear_trace_id,
)


class TestTraceIdContext:
    """測試 trace_id 上下文管理"""

    def test_set_and_get_trace_id(self):
        """應能設定和取得 trace_id"""
        test_id = str(uuid.uuid4())
        set_trace_id(test_id)
        assert get_trace_id() == test_id
        clear_trace_id()

    def test_get_trace_id_when_not_set(self):
        """未設定時應返回 None"""
        clear_trace_id()
        assert get_trace_id() is None

    def test_clear_trace_id(self):
        """應能清除 trace_id"""
        set_trace_id("test-123")
        clear_trace_id()
        assert get_trace_id() is None


class TestStructuredLogger:
    """測試結構化日誌記錄器"""

    def test_log_includes_trace_id(self):
        """AC-A3: 日誌應包含 trace_id"""
        # 設定 trace_id
        test_trace_id = "test-trace-123"
        set_trace_id(test_trace_id)

        # 建立 logger 並捕獲輸出
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))

        logger = StructuredLogger("test_logger")
        logger.logger.handlers = [handler]
        logger.logger.setLevel(logging.INFO)

        # 記錄一條訊息
        logger.info("Test message", extra_field="value")

        # 解析輸出
        output = stream.getvalue()
        log_data = json.loads(output)

        assert log_data["trace_id"] == test_trace_id
        assert log_data["message"] == "Test message"
        assert log_data["extra_field"] == "value"

        clear_trace_id()

    def test_log_structured_format(self):
        """日誌應為結構化 JSON 格式"""
        set_trace_id("struct-test-456")

        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))

        logger = StructuredLogger("test_structured")
        logger.logger.handlers = [handler]
        logger.logger.setLevel(logging.INFO)

        logger.info("Structured test")

        output = stream.getvalue()
        log_data = json.loads(output)

        # 驗證必要欄位
        assert "timestamp" in log_data
        assert "level" in log_data
        assert "logger" in log_data
        assert "message" in log_data
        assert "trace_id" in log_data

        assert log_data["level"] == "INFO"
        assert log_data["logger"] == "test_structured"

        clear_trace_id()

    def test_log_levels(self):
        """應支援各種日誌等級"""
        set_trace_id("level-test")

        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))

        logger = StructuredLogger("test_levels")
        logger.logger.handlers = [handler]
        logger.logger.setLevel(logging.DEBUG)

        # 測試各等級
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message")

        output = stream.getvalue().strip().split("\n")
        assert len(output) == 4

        levels = [json.loads(line)["level"] for line in output]
        assert levels == ["DEBUG", "INFO", "WARNING", "ERROR"]

        clear_trace_id()

    def test_log_with_exception(self):
        """應能記錄例外資訊"""
        set_trace_id("exc-test")

        stream = StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(logging.Formatter("%(message)s"))

        logger = StructuredLogger("test_exception")
        logger.logger.handlers = [handler]
        logger.logger.setLevel(logging.ERROR)

        try:
            raise ValueError("Test error")
        except ValueError:
            logger.exception("An error occurred")

        output = stream.getvalue()
        log_data = json.loads(output)

        assert log_data["level"] == "ERROR"
        assert "exception" in log_data
        assert "ValueError" in log_data["exception"]

        clear_trace_id()


class TestLoggingMiddleware:
    """測試日誌中間件"""

    @pytest.fixture
    def app_with_middleware(self):
        """建立帶有日誌中間件的測試 app"""
        app = FastAPI()
        app.add_middleware(LoggingMiddleware)

        @app.get("/test")
        async def test_endpoint():
            return {"status": "ok"}

        @app.get("/error")
        async def error_endpoint():
            raise ValueError("Test error")

        return app

    def test_middleware_sets_trace_id(self, app_with_middleware):
        """中間件應為每個請求設定 trace_id"""
        client = TestClient(app_with_middleware)

        response = client.get("/test")

        assert response.status_code == 200
        # 回應 header 應包含 trace_id
        assert "X-Trace-ID" in response.headers
        # 應為有效的 UUID 格式
        trace_id = response.headers["X-Trace-ID"]
        uuid.UUID(trace_id)  # 會拋出 ValueError 如果格式無效

    def test_middleware_accepts_incoming_trace_id(self, app_with_middleware):
        """中間件應接受傳入的 trace_id"""
        client = TestClient(app_with_middleware)

        incoming_trace_id = str(uuid.uuid4())
        response = client.get("/test", headers={"X-Trace-ID": incoming_trace_id})

        assert response.status_code == 200
        assert response.headers["X-Trace-ID"] == incoming_trace_id

    def test_middleware_logs_request_response(self, app_with_middleware):
        """中間件應記錄請求和回應"""
        with patch("app.middleware.logging.logger") as mock_logger:
            client = TestClient(app_with_middleware)

            response = client.get("/test")

            assert response.status_code == 200
            # 驗證有呼叫日誌記錄
            assert mock_logger.info.called

    def test_middleware_logs_error(self, app_with_middleware):
        """中間件應記錄錯誤"""
        with patch("app.middleware.logging.logger") as mock_logger:
            client = TestClient(app_with_middleware, raise_server_exceptions=False)

            response = client.get("/error")

            assert response.status_code == 500
            # 驗證有呼叫錯誤日誌
            assert mock_logger.error.called or mock_logger.exception.called

    def test_unique_trace_id_per_request(self, app_with_middleware):
        """每個請求應有唯一的 trace_id"""
        client = TestClient(app_with_middleware)

        response1 = client.get("/test")
        response2 = client.get("/test")

        trace_id1 = response1.headers["X-Trace-ID"]
        trace_id2 = response2.headers["X-Trace-ID"]

        assert trace_id1 != trace_id2
