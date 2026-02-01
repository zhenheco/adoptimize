# -*- coding: utf-8 -*-
"""LINE JWS 簽章產生器測試"""

import pytest
from app.services.line_jws_signer import LineJWSSigner


class TestLineJWSSigner:
    """測試 LINE JWS 簽章產生"""

    def test_generate_signature_returns_string(self):
        """應該回傳 JWS 字串"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        assert isinstance(signature, str)
        assert len(signature) > 0

    def test_signature_has_three_parts(self):
        """JWS 應該有三個以 . 分隔的部分"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        parts = signature.split(".")
        assert len(parts) == 3

    def test_header_contains_access_key(self):
        """Header 應該包含 access_key 作為 kid"""
        import base64
        import json

        signer = LineJWSSigner(
            access_key="my_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="GET",
            path="/api/v3/adaccounts",
            body=None,
        )
        header_b64 = signature.split(".")[0]
        # 補齊 padding
        padding = 4 - len(header_b64) % 4
        if padding != 4:
            header_b64 += "=" * padding
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        assert header["alg"] == "HS256"
        assert header["kid"] == "my_access_key"
        assert header["typ"] == "text/plain"

    def test_signature_with_body(self):
        """帶有 body 的請求應該正確產生簽章"""
        signer = LineJWSSigner(
            access_key="test_access_key",
            secret_key="test_secret_key",
        )
        signature = signer.generate_signature(
            method="POST",
            path="/api/v3/adaccounts/123/campaigns",
            body='{"name": "Test Campaign"}',
        )
        assert isinstance(signature, str)
        assert len(signature.split(".")) == 3
