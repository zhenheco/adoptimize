#!/usr/bin/env python3
"""Check if stored Meta tokens are attributed to our app."""
import asyncio
import os
import json
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "")
META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")


async def main():
    print("META_APP_ID: " + META_APP_ID)
    secret_hint = "***" + META_APP_SECRET[-4:] if META_APP_SECRET else "NOT SET"
    print("META_APP_SECRET: " + secret_hint)

    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            text("SELECT name, external_id, access_token FROM ad_accounts WHERE platform = 'meta' AND status = 'active'")
        )
        rows = result.fetchall()
        print("Found " + str(len(rows)) + " active Meta accounts")

        for row in rows:
            name, pid, token = row
            print("")
            print("Account: " + str(name))
            print("PlatformID: " + str(pid))

            if not token:
                print("  NO TOKEN - SKIP")
                continue

            token_hint = "***" + token[-8:]
            print("Token: " + token_hint)

            app_token = META_APP_ID + "|" + META_APP_SECRET
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://graph.facebook.com/v21.0/debug_token",
                    params={"input_token": token, "access_token": app_token},
                )
                data = resp.json()

            if "data" in data:
                td = data["data"]
                app_id = str(td.get("app_id", "?"))
                app_name = str(td.get("application", "?"))
                is_valid = td.get("is_valid", False)
                scopes = td.get("scopes", [])
                token_type = str(td.get("type", "?"))

                print("  app_id: " + app_id)
                print("  app_name: " + app_name)
                print("  is_valid: " + str(is_valid))
                print("  type: " + token_type)
                print("  scopes: " + ", ".join(scopes))

                if app_id == META_APP_ID:
                    print("  >>> TOKEN MATCHES OUR APP <<<")
                else:
                    print("  >>> TOKEN MISMATCH! Belongs to app " + app_id + " (" + app_name + ") <<<")
                    print("  >>> This is why the counter shows 0! <<<")

                if "ads_management" in scopes:
                    print("  ads_management: YES")
                else:
                    print("  ads_management: MISSING!")
            else:
                print("  ERROR: " + json.dumps(data))

    await engine.dispose()
    print("")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
