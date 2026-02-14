# -*- coding: utf-8 -*-
"""
Mock 模式判斷工具

統一管理所有平台的 Mock 模式檢查邏輯。
支援 per-platform override 和全域 fallback。

環境變數優先順序：
1. USE_MOCK_{PLATFORM}_API (per-platform override)
2. USE_MOCK_ADS_API (全域設定, 預設 true)
"""

import os


# 平台名稱對應到環境變數名稱
_PLATFORM_ENV_VARS: dict[str, str] = {
    "google": "USE_MOCK_GOOGLE_ADS_API",
    "meta": "USE_MOCK_META_API",
    "linkedin": "USE_MOCK_LINKEDIN_API",
    "pinterest": "USE_MOCK_PINTEREST_API",
    "tiktok": "USE_MOCK_TIKTOK_API",
    "reddit": "USE_MOCK_REDDIT_API",
}

_GLOBAL_ENV_VAR = "USE_MOCK_ADS_API"


def is_mock_mode(platform: str) -> bool:
    """
    判斷指定平台是否使用 Mock 模式

    優先檢查 per-platform override，再 fallback 到全域設定。

    Args:
        platform: 平台名稱 (google, meta, linkedin, pinterest, tiktok, reddit)

    Returns:
        True 表示使用 Mock 模式
    """
    platform_env = _PLATFORM_ENV_VARS.get(platform)
    if platform_env:
        value = os.getenv(platform_env)
        if value is not None:
            return value.strip().lower() == "true"

    return os.getenv(_GLOBAL_ENV_VAR, "true").strip().lower() == "true"
