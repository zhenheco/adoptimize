# -*- coding: utf-8 -*-
"""
LINE Ads JWS 簽章產生器

LINE Ads API 使用 JWS (JSON Web Signature) 進行認證。
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Optional


class LineJWSSigner:
    """LINE Ads JWS 簽章產生器"""

    def __init__(self, access_key: str, secret_key: str):
        """
        初始化簽章產生器

        Args:
            access_key: LINE Ads Access Key
            secret_key: LINE Ads Secret Key
        """
        self.access_key = access_key
        self.secret_key = secret_key

    def _base64url_encode(self, data: bytes) -> str:
        """Base64 URL 安全編碼（無 padding）"""
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    def _hash_body(self, body: Optional[str]) -> str:
        """計算 body 的 SHA-256 雜湊值"""
        if not body:
            return hashlib.sha256(b"").hexdigest()
        return hashlib.sha256(body.encode("utf-8")).hexdigest()

    def generate_signature(
        self,
        method: str,
        path: str,
        body: Optional[str] = None,
        content_type: str = "application/json",
    ) -> str:
        """
        產生 JWS 簽章

        Args:
            method: HTTP 方法 (GET, POST, etc.)
            path: API 路徑 (e.g., /api/v3/adaccounts)
            body: 請求 body (JSON 字串)
            content_type: Content-Type header

        Returns:
            JWS 簽章字串
        """
        # 1. 建構 Header
        header = {
            "alg": "HS256",
            "kid": self.access_key,
            "typ": "text/plain",
        }
        header_b64 = self._base64url_encode(json.dumps(header).encode("utf-8"))

        # 2. 建構 Payload
        date = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        hashed_body = self._hash_body(body)

        # Canonical request format
        payload_parts = [
            date,
            path,
            content_type if body else "",
            hashed_body,
        ]
        payload = "\n".join(payload_parts)
        payload_b64 = self._base64url_encode(payload.encode("utf-8"))

        # 3. 產生簽章
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            self.secret_key.encode("utf-8"),
            signing_input.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        signature_b64 = self._base64url_encode(signature)

        return f"{header_b64}.{payload_b64}.{signature_b64}"

    def get_authorization_header(
        self,
        method: str,
        path: str,
        body: Optional[str] = None,
    ) -> str:
        """
        取得 Authorization header 值

        Returns:
            Bearer {JWS} 格式的字串
        """
        jws = self.generate_signature(method, path, body)
        return f"Bearer {jws}"
