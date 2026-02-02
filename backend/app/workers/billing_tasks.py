# -*- coding: utf-8 -*-
"""
計費相關定期任務

定期執行的計費操作：
- 每月 1 日扣除訂閱月費
- 每月 1 日重置 AI 配額
"""

import logging

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.subscription import Subscription
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)
settings = get_settings()


def get_async_session() -> sessionmaker:
    """
    建立異步 Session 工廠

    用於 Celery 任務中建立資料庫連線
    """
    engine = create_async_engine(settings.database_url, echo=False)
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@shared_task(name="app.workers.billing_tasks.charge_monthly_fees")
def charge_monthly_fees():
    """
    扣除所有用戶的訂閱月費

    此任務應在每月 1 日執行
    """
    import asyncio

    async def _charge_fees():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            try:
                # 取得所有活躍訂閱
                result = await db.execute(
                    select(Subscription).where(Subscription.is_active == True)
                )
                subscriptions = result.scalars().all()

                success_count = 0
                failed_count = 0

                for subscription in subscriptions:
                    # 跳過免費方案
                    if subscription.monthly_fee == 0:
                        continue

                    try:
                        charged = await BillingService.charge_subscription_fee(
                            db, subscription.user_id
                        )
                        if charged:
                            success_count += 1
                            logger.info(
                                f"成功扣除月費：user_id={subscription.user_id}, "
                                f"amount={subscription.monthly_fee}"
                            )
                        else:
                            failed_count += 1
                            logger.warning(
                                f"月費扣除失敗（餘額不足）：user_id={subscription.user_id}"
                            )
                    except Exception as e:
                        failed_count += 1
                        logger.error(
                            f"月費扣除異常：user_id={subscription.user_id}, error={e}"
                        )

                await db.commit()
                logger.info(
                    f"月費扣除完成：成功 {success_count} 筆，失敗 {failed_count} 筆"
                )
                return {"success": success_count, "failed": failed_count}

            except Exception as e:
                logger.error(f"月費扣除任務執行失敗：{e}")
                raise

    return asyncio.run(_charge_fees())


@shared_task(name="app.workers.billing_tasks.reset_monthly_quotas")
def reset_monthly_quotas():
    """
    重置所有用戶的月度 AI 配額

    此任務應在每月 1 日執行
    """
    import asyncio

    async def _reset_quotas():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            try:
                # 取得所有活躍訂閱
                result = await db.execute(
                    select(Subscription).where(Subscription.is_active == True)
                )
                subscriptions = result.scalars().all()

                reset_count = 0

                for subscription in subscriptions:
                    try:
                        await BillingService.reset_monthly_quotas(
                            db, subscription.user_id
                        )
                        reset_count += 1
                    except Exception as e:
                        logger.error(
                            f"配額重置失敗：user_id={subscription.user_id}, error={e}"
                        )

                await db.commit()
                logger.info(f"配額重置完成：共 {reset_count} 筆")
                return {"reset_count": reset_count}

            except Exception as e:
                logger.error(f"配額重置任務執行失敗：{e}")
                raise

    return asyncio.run(_reset_quotas())


@shared_task(name="app.workers.billing_tasks.check_subscription_status")
def check_subscription_status():
    """
    檢查訂閱狀態

    檢查連續未付款的用戶，可選擇停用訂閱或降級至免費方案
    """
    import asyncio

    async def _check_status():
        AsyncSessionLocal = get_async_session()
        async with AsyncSessionLocal() as db:
            try:
                # 目前只記錄日誌，未來可加入自動降級邏輯
                result = await db.execute(
                    select(Subscription).where(Subscription.is_active == True)
                )
                subscriptions = result.scalars().all()

                logger.info(f"訂閱狀態檢查完成：共 {len(subscriptions)} 個活躍訂閱")
                return {"active_subscriptions": len(subscriptions)}

            except Exception as e:
                logger.error(f"訂閱狀態檢查失敗：{e}")
                raise

    return asyncio.run(_check_status())
