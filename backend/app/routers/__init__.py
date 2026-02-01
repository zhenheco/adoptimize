# -*- coding: utf-8 -*-
"""
API 路由模組

註冊所有 API 路由：
- /auth - 認證系統
- /autopilot - 自動駕駛（SDD v2.0）
- /reports - 報告（SDD v2.0）
- /ai - AI 創作（SDD v2.0）
- /dashboard - 儀表板總覽
- /creatives - 素材管理
- /audiences - 受眾分析
- /recommendations - 建議/行動中心
- /suggestions - 智慧受眾建議
- /health - 健檢系統
- /audits - 健檢報告（舊路由，保留相容性）
- /accounts - 帳戶管理
- /accounts/connect/* - OAuth 連接
"""

from fastapi import APIRouter

from app.routers import (
    accounts,
    ai_copywriting,
    auth,
    audits,
    audiences,
    autopilot,
    creatives,
    dashboard,
    health,
    history,
    notifications,
    oauth_google,
    oauth_line,
    oauth_linkedin,
    oauth_meta,
    oauth_reddit,
    oauth_tiktok,
    recommendations,
    reports,
    suggestions,
)

api_router = APIRouter()

# 認證路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# 自動駕駛路由
api_router.include_router(
    autopilot.router,
    prefix="/autopilot",
    tags=["Autopilot"],
)

# 報告路由
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
)

# AI 文案生成路由
api_router.include_router(
    ai_copywriting.router,
    prefix="/ai",
    tags=["AI"],
)

# 儀表板路由
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"],
)

# 素材管理路由
api_router.include_router(
    creatives.router,
    prefix="/creatives",
    tags=["Creatives"],
)

# 受眾分析路由
api_router.include_router(
    audiences.router,
    prefix="/audiences",
    tags=["Audiences"],
)

# 建議/行動中心路由
api_router.include_router(
    recommendations.router,
    prefix="/recommendations",
    tags=["Recommendations"],
)

# 智慧受眾建議路由
api_router.include_router(
    suggestions.router,
    prefix="/suggestions",
    tags=["Smart Suggestions"],
)

# 健檢系統路由（新路由：/health/audit）
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

# 健檢報告路由（舊路由，保留相容性）
api_router.include_router(
    audits.router,
    prefix="/audits",
    tags=["Health Audits (Legacy)"],
)

# 帳戶管理路由
api_router.include_router(
    accounts.router,
    prefix="/accounts",
    tags=["Accounts"],
)

# 通知系統路由
api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["Notifications"],
)

# 操作歷史路由
api_router.include_router(
    history.router,
    prefix="/history",
    tags=["History"],
)

# OAuth 連接路由
api_router.include_router(
    oauth_google.router,
    prefix="/accounts/connect/google",
    tags=["OAuth - Google Ads"],
)

api_router.include_router(
    oauth_meta.router,
    prefix="/accounts/connect/meta",
    tags=["OAuth - Meta"],
)

api_router.include_router(
    oauth_tiktok.router,
    prefix="/accounts/connect/tiktok",
    tags=["OAuth - TikTok"],
)

api_router.include_router(
    oauth_reddit.router,
    prefix="/accounts/connect/reddit",
    tags=["OAuth - Reddit"],
)

api_router.include_router(
    oauth_line.router,
    prefix="/accounts/connect/line",
    tags=["OAuth - LINE"],
)

api_router.include_router(
    oauth_linkedin.router,
    prefix="/accounts/connect/linkedin",
    tags=["OAuth - LinkedIn"],
)
