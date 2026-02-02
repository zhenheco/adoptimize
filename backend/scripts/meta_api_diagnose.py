#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Meta API 診斷腳本

用於診斷 Meta App Review 被拒絕的原因，並提供解決方案。

功能：
1. 檢查資料庫中所有 Meta 帳號的 Token 狀態
2. 驗證 Token 是否有效（呼叫 /me 端點）
3. 統計 API 呼叫成功/失敗率
4. 提供改善建議

使用方式：
    python scripts/meta_api_diagnose.py

如果要測試特定 Token：
    python scripts/meta_api_diagnose.py --token YOUR_ACCESS_TOKEN
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime

# 載入環境變數和專案路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

import httpx

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class MetaDiagnostic:
    """Meta API 診斷工具"""

    def __init__(self):
        self.results = {
            "total_accounts": 0,
            "valid_tokens": 0,
            "invalid_tokens": 0,
            "expired_tokens": 0,
            "successful_api_calls": 0,
            "failed_api_calls": 0,
            "errors": [],
        }

    async def validate_token(self, access_token: str) -> dict:
        """
        驗證 Access Token 是否有效

        Args:
            access_token: Meta access token

        Returns:
            驗證結果
        """
        if not access_token or not access_token.strip():
            return {
                "valid": False,
                "error": "Token 為空",
                "error_code": "EMPTY_TOKEN",
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 呼叫 /me 端點驗證 token
                response = await client.get(
                    f"{GRAPH_API_BASE}/me",
                    params={
                        "access_token": access_token,
                        "fields": "id,name",
                    },
                )

                data = response.json()

                if "error" in data:
                    error = data["error"]
                    error_code = error.get("code", 0)
                    error_message = error.get("message", "Unknown error")

                    self.results["failed_api_calls"] += 1

                    # 判斷錯誤類型
                    if error_code == 190:
                        return {
                            "valid": False,
                            "error": error_message,
                            "error_code": "TOKEN_EXPIRED",
                        }
                    elif error_code == 17:
                        return {
                            "valid": False,
                            "error": error_message,
                            "error_code": "RATE_LIMITED",
                        }
                    else:
                        return {
                            "valid": False,
                            "error": error_message,
                            "error_code": f"ERROR_{error_code}",
                        }

                # Token 有效
                self.results["successful_api_calls"] += 1
                return {
                    "valid": True,
                    "user_id": data.get("id"),
                    "user_name": data.get("name"),
                }

            except httpx.TimeoutException:
                self.results["failed_api_calls"] += 1
                return {
                    "valid": False,
                    "error": "請求超時",
                    "error_code": "TIMEOUT",
                }
            except Exception as e:
                self.results["failed_api_calls"] += 1
                return {
                    "valid": False,
                    "error": str(e),
                    "error_code": "UNKNOWN",
                }

    async def check_token_permissions(self, access_token: str) -> dict:
        """
        檢查 Token 的權限範圍

        Args:
            access_token: Meta access token

        Returns:
            權限資訊
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{GRAPH_API_BASE}/me/permissions",
                    params={"access_token": access_token},
                )

                data = response.json()

                if "error" in data:
                    return {"error": data["error"].get("message")}

                permissions = data.get("data", [])
                return {
                    "permissions": [
                        p["permission"]
                        for p in permissions
                        if p.get("status") == "granted"
                    ],
                }

            except Exception as e:
                return {"error": str(e)}

    async def check_ad_accounts(self, access_token: str) -> dict:
        """
        檢查 Token 可存取的廣告帳號

        Args:
            access_token: Meta access token

        Returns:
            廣告帳號資訊
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{GRAPH_API_BASE}/me/adaccounts",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,account_status",
                    },
                )

                data = response.json()

                if "error" in data:
                    self.results["failed_api_calls"] += 1
                    return {"error": data["error"].get("message")}

                self.results["successful_api_calls"] += 1
                accounts = data.get("data", [])
                return {
                    "count": len(accounts),
                    "accounts": accounts[:5],  # 只顯示前 5 個
                }

            except Exception as e:
                self.results["failed_api_calls"] += 1
                return {"error": str(e)}

    async def diagnose_token(self, access_token: str) -> None:
        """
        完整診斷一個 Token

        Args:
            access_token: Meta access token
        """
        print("\n" + "=" * 60)
        print("🔍 Meta API Token 診斷")
        print("=" * 60)

        # 1. 驗證 Token
        print("\n📝 1. 驗證 Token 有效性...")
        validation = await self.validate_token(access_token)

        if validation["valid"]:
            print(f"   ✅ Token 有效")
            print(f"   👤 用戶 ID: {validation.get('user_id')}")
            print(f"   📛 用戶名稱: {validation.get('user_name')}")
            self.results["valid_tokens"] += 1
        else:
            print(f"   ❌ Token 無效")
            print(f"   錯誤類型: {validation.get('error_code')}")
            print(f"   錯誤訊息: {validation.get('error')}")

            if validation.get("error_code") == "TOKEN_EXPIRED":
                self.results["expired_tokens"] += 1
            else:
                self.results["invalid_tokens"] += 1

            return  # Token 無效就不繼續

        # 2. 檢查權限
        print("\n📝 2. 檢查權限範圍...")
        permissions = await self.check_token_permissions(access_token)

        if "error" in permissions:
            print(f"   ❌ 無法取得權限: {permissions['error']}")
        else:
            granted = permissions.get("permissions", [])
            print(f"   已授權權限 ({len(granted)} 個):")
            for perm in granted:
                print(f"     - {perm}")

            # 檢查必要權限
            required = ["ads_management", "ads_read"]
            missing = [p for p in required if p not in granted]
            if missing:
                print(f"\n   ⚠️ 缺少必要權限: {', '.join(missing)}")
                print("   請到 Meta 開發者後台申請這些權限")

        # 3. 檢查廣告帳號
        print("\n📝 3. 檢查可存取的廣告帳號...")
        ad_accounts = await self.check_ad_accounts(access_token)

        if "error" in ad_accounts:
            print(f"   ❌ 無法取得廣告帳號: {ad_accounts['error']}")
        else:
            count = ad_accounts.get("count", 0)
            print(f"   找到 {count} 個廣告帳號")

            if count == 0:
                print("   ⚠️ 沒有找到廣告帳號")
                print("   這可能導致 API 呼叫失敗，請確認：")
                print("   1. 用戶有連結的廣告帳號")
                print("   2. Token 有足夠權限存取廣告帳號")
            else:
                accounts = ad_accounts.get("accounts", [])
                for acc in accounts:
                    status = acc.get("account_status", "?")
                    status_text = {
                        1: "ACTIVE",
                        2: "DISABLED",
                        3: "UNSETTLED",
                        7: "PENDING_RISK_REVIEW",
                        8: "PENDING_SETTLEMENT",
                        9: "IN_GRACE_PERIOD",
                        100: "PENDING_CLOSURE",
                        101: "CLOSED",
                        201: "ANY_ACTIVE",
                        202: "ANY_CLOSED",
                    }.get(status, f"UNKNOWN({status})")
                    print(f"     - {acc.get('name')} ({acc.get('id')}): {status_text}")

    async def diagnose_database_accounts(self) -> None:
        """
        診斷資料庫中所有 Meta 帳號
        """
        print("\n" + "=" * 60)
        print("🗄️ 資料庫帳號診斷")
        print("=" * 60)

        try:
            from app.db.base import create_worker_session_maker
            from app.models.ad_account import AdAccount
            from sqlalchemy import select

            worker_session_maker = create_worker_session_maker()
            async with worker_session_maker() as session:
                result = await session.execute(
                    select(AdAccount).where(AdAccount.platform == "meta")
                )
                accounts = list(result.scalars().all())

                self.results["total_accounts"] = len(accounts)
                print(f"\n找到 {len(accounts)} 個 Meta 帳號")

                for account in accounts:
                    print(f"\n--- 帳號: {account.name} ({account.external_id}) ---")
                    print(f"狀態: {account.status}")

                    if account.access_token:
                        print("Token: 已設定")
                        validation = await self.validate_token(account.access_token)
                        if validation["valid"]:
                            print(f"  ✅ Token 有效")
                            self.results["valid_tokens"] += 1
                        else:
                            print(f"  ❌ Token 無效: {validation.get('error_code')}")
                            if validation.get("error_code") == "TOKEN_EXPIRED":
                                self.results["expired_tokens"] += 1
                            else:
                                self.results["invalid_tokens"] += 1
                    else:
                        print("Token: ❌ 未設定")
                        self.results["invalid_tokens"] += 1

        except ImportError as e:
            print(f"\n⚠️ 無法載入資料庫模組: {e}")
            print("請確認在正確的目錄下執行此腳本")
        except Exception as e:
            print(f"\n❌ 診斷失敗: {e}")

    def print_summary(self) -> None:
        """列印診斷摘要"""
        print("\n" + "=" * 60)
        print("📊 診斷摘要")
        print("=" * 60)

        print(f"\n帳號統計:")
        print(f"  總帳號數: {self.results['total_accounts']}")
        print(f"  有效 Token: {self.results['valid_tokens']}")
        print(f"  無效 Token: {self.results['invalid_tokens']}")
        print(f"  過期 Token: {self.results['expired_tokens']}")

        print(f"\nAPI 呼叫統計:")
        print(f"  成功: {self.results['successful_api_calls']}")
        print(f"  失敗: {self.results['failed_api_calls']}")

        total_calls = self.results["successful_api_calls"] + self.results["failed_api_calls"]
        if total_calls > 0:
            success_rate = self.results["successful_api_calls"] / total_calls * 100
            print(f"  成功率: {success_rate:.1f}%")

            if success_rate < 80:
                print("\n⚠️ 警告: API 成功率低於 80%")
                print("這可能導致 Meta App Review 被拒絕")

        print("\n" + "=" * 60)
        print("💡 建議改善措施")
        print("=" * 60)

        if self.results["invalid_tokens"] > 0 or self.results["expired_tokens"] > 0:
            print("\n1. 修復無效/過期 Token:")
            print("   - 前往 Meta 開發者後台重新產生 Token")
            print("   - 或請用戶重新授權連接廣告帳號")

        if self.results["failed_api_calls"] > 0:
            print("\n2. 減少失敗的 API 呼叫:")
            print("   - 已修正：sync_meta.py 現在會在呼叫 API 前驗證 Token")
            print("   - 無效 Token 的帳號不會再發送 API 請求")

        print("\n3. 產生成功的 API 呼叫記錄:")
        print("   - 使用有效的測試 Token 執行 meta_api_test_calls.py")
        print("   - 確保有真實的廣告帳號可供測試")
        print("   - 多執行幾次以累積成功呼叫記錄")


async def main():
    parser = argparse.ArgumentParser(description="Meta API 診斷工具")
    parser.add_argument(
        "--token",
        help="要診斷的 Access Token（不提供則檢查資料庫中所有帳號）",
    )
    parser.add_argument(
        "--db-only",
        action="store_true",
        help="只檢查資料庫中的帳號",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("🏥 Meta API 診斷工具")
    print(f"📅 時間: {datetime.now().isoformat()}")
    print("=" * 60)

    diagnostic = MetaDiagnostic()

    if args.token:
        # 診斷指定的 Token
        await diagnostic.diagnose_token(args.token)
    else:
        # 診斷資料庫中所有帳號
        await diagnostic.diagnose_database_accounts()

    # 列印摘要
    diagnostic.print_summary()


if __name__ == "__main__":
    asyncio.run(main())
