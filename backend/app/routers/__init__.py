# -*- coding: utf-8 -*-
"""
API 路由模組
"""

from fastapi import APIRouter

from app.routers import audits, oauth_google, oauth_meta

api_router = APIRouter()

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
    audits.router,
    prefix="/audits",
    tags=["Health Audits"],
)
