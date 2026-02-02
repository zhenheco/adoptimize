#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Meta API 測試呼叫腳本

用於產生 Meta App Review 所需的 API 測試呼叫記錄。
在開發模式下執行，以證明應用程式確實需要這些權限。

使用方式：
1. 確保你有有效的 Meta Access Token（測試用戶）
2. 執行：python scripts/meta_api_test_calls.py

需要的權限：
- public_profile
- ads_management (standard access)
- ads_read
"""

import os
import sys
import httpx
import asyncio
from datetime import datetime

# 載入環境變數
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()


GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


async def test_public_profile(access_token: str) -> dict:
    """
    測試 public_profile 權限

    呼叫 /me 端點取得用戶基本資訊
    """
    print("\n📝 測試 public_profile 權限...")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/me",
            params={
                "access_token": access_token,
                "fields": "id,name,email"
            }
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功！用戶 ID: {data.get('id')}, 名稱: {data.get('name')}")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def test_ads_management_get_ad_accounts(access_token: str) -> dict:
    """
    測試 ads_management 權限 - 取得廣告帳號列表

    呼叫 /me/adaccounts 端點
    """
    print("\n📝 測試 ads_management 權限 - 取得廣告帳號...")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/me/adaccounts",
            params={
                "access_token": access_token,
                "fields": "id,name,account_status,currency,timezone_name"
            }
        )

        if response.status_code == 200:
            data = response.json()
            accounts = data.get("data", [])
            print(f"✅ 成功！找到 {len(accounts)} 個廣告帳號")
            for acc in accounts[:3]:  # 顯示前 3 個
                print(f"   - {acc.get('name')} ({acc.get('id')})")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def test_ads_management_get_campaigns(access_token: str, ad_account_id: str) -> dict:
    """
    測試 ads_management 權限 - 取得廣告活動

    呼叫 /{ad_account_id}/campaigns 端點
    """
    print(f"\n📝 測試 ads_management 權限 - 取得廣告活動 (帳號: {ad_account_id})...")

    # 確保帳號 ID 格式正確
    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/{ad_account_id}/campaigns",
            params={
                "access_token": access_token,
                "fields": "id,name,status,objective,daily_budget,lifetime_budget",
                "limit": 10
            }
        )

        if response.status_code == 200:
            data = response.json()
            campaigns = data.get("data", [])
            print(f"✅ 成功！找到 {len(campaigns)} 個廣告活動")
            for camp in campaigns[:3]:
                print(f"   - {camp.get('name')} ({camp.get('status')})")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def test_ads_management_get_adsets(access_token: str, ad_account_id: str) -> dict:
    """
    測試 ads_management 權限 - 取得廣告組合
    """
    print(f"\n📝 測試 ads_management 權限 - 取得廣告組合...")

    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/{ad_account_id}/adsets",
            params={
                "access_token": access_token,
                "fields": "id,name,status,daily_budget,targeting",
                "limit": 10
            }
        )

        if response.status_code == 200:
            data = response.json()
            adsets = data.get("data", [])
            print(f"✅ 成功！找到 {len(adsets)} 個廣告組合")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def test_ads_management_get_ads(access_token: str, ad_account_id: str) -> dict:
    """
    測試 ads_management 權限 - 取得廣告
    """
    print(f"\n📝 測試 ads_management 權限 - 取得廣告...")

    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/{ad_account_id}/ads",
            params={
                "access_token": access_token,
                "fields": "id,name,status,creative",
                "limit": 10
            }
        )

        if response.status_code == 200:
            data = response.json()
            ads = data.get("data", [])
            print(f"✅ 成功！找到 {len(ads)} 個廣告")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def test_ads_management_get_insights(access_token: str, ad_account_id: str) -> dict:
    """
    測試 ads_management 權限 - 取得廣告洞察報告
    """
    print(f"\n📝 測試 ads_management 權限 - 取得廣告洞察...")

    if not ad_account_id.startswith("act_"):
        ad_account_id = f"act_{ad_account_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API_BASE}/{ad_account_id}/insights",
            params={
                "access_token": access_token,
                "fields": "impressions,clicks,spend,cpc,cpm,ctr",
                "date_preset": "last_7d"
            }
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功！取得廣告洞察資料")
            return {"success": True, "data": data}
        else:
            error = response.json().get("error", {})
            print(f"❌ 失敗：{error.get('message')}")
            return {"success": False, "error": error}


async def run_all_tests(access_token: str):
    """
    執行所有 API 測試
    """
    print("=" * 60)
    print("🚀 Meta API 測試呼叫腳本")
    print(f"📅 時間：{datetime.now().isoformat()}")
    print("=" * 60)

    results = {}

    # 1. 測試 public_profile
    results["public_profile"] = await test_public_profile(access_token)

    # 2. 測試 ads_management - 取得廣告帳號
    ad_accounts_result = await test_ads_management_get_ad_accounts(access_token)
    results["ad_accounts"] = ad_accounts_result

    # 如果有廣告帳號，繼續測試其他端點
    if ad_accounts_result["success"]:
        accounts = ad_accounts_result["data"].get("data", [])
        if accounts:
            # 使用第一個帳號進行測試
            first_account = accounts[0]
            account_id = first_account["id"]

            # 3. 測試 campaigns
            results["campaigns"] = await test_ads_management_get_campaigns(
                access_token, account_id
            )

            # 4. 測試 adsets
            results["adsets"] = await test_ads_management_get_adsets(
                access_token, account_id
            )

            # 5. 測試 ads
            results["ads"] = await test_ads_management_get_ads(
                access_token, account_id
            )

            # 6. 測試 insights
            results["insights"] = await test_ads_management_get_insights(
                access_token, account_id
            )

    # 統計結果
    print("\n" + "=" * 60)
    print("📊 測試結果摘要")
    print("=" * 60)

    success_count = sum(1 for r in results.values() if r.get("success"))
    total_count = len(results)

    print(f"✅ 成功：{success_count}/{total_count}")
    print(f"❌ 失敗：{total_count - success_count}/{total_count}")

    print("\n💡 提示：")
    print("   - 這些 API 呼叫會記錄在 Meta 開發者後台")
    print("   - 多執行幾次以產生足夠的測試記錄")
    print("   - 確保使用開發模式下的測試用戶 Token")

    return results


if __name__ == "__main__":
    # 從環境變數或命令列參數取得 Access Token
    access_token = os.getenv("META_TEST_ACCESS_TOKEN") or (
        sys.argv[1] if len(sys.argv) > 1 else None
    )

    if not access_token:
        print("❌ 錯誤：請提供 Meta Access Token")
        print()
        print("使用方式：")
        print("  方法 1：設定環境變數")
        print("    export META_TEST_ACCESS_TOKEN=your_token")
        print("    python scripts/meta_api_test_calls.py")
        print()
        print("  方法 2：命令列參數")
        print("    python scripts/meta_api_test_calls.py your_token")
        print()
        print("如何取得 Token：")
        print("  1. 前往 Meta 開發者後台")
        print("  2. 選擇你的 App")
        print("  3. 工具 > Graph API Explorer")
        print("  4. 選擇權限：public_profile, ads_management, ads_read")
        print("  5. 點擊 'Generate Access Token'")
        sys.exit(1)

    asyncio.run(run_all_tests(access_token))
