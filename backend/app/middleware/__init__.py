# -*- coding: utf-8 -*-
"""
中間件模組
"""

from app.middleware.auth import get_current_user, get_current_user_optional
from app.middleware.logging import (
    LoggingMiddleware,
    StructuredLogger,
    get_trace_id,
    set_trace_id,
    clear_trace_id,
    logger,
    setup_logging,
)

__all__ = [
    "get_current_user",
    "get_current_user_optional",
    "LoggingMiddleware",
    "StructuredLogger",
    "get_trace_id",
    "set_trace_id",
    "clear_trace_id",
    "logger",
    "setup_logging",
]
