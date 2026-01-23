# SDD v2.0 遷移實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將專案從 v1.0（代操工具）遷移到 v2.0（AI 廣告顧問），實作自動駕駛、簡化儀表板、AI 創作等功能。

**Architecture:** 保留 Python FastAPI 後端，使用 APScheduler 處理定時任務。前端重構為簡化儀表板，移除專業功能頁面，新增自動駕駛設定和 AI 創作頁面。

**Tech Stack:** FastAPI, APScheduler, SQLAlchemy, Next.js, TypeScript, Tailwind CSS, OpenAI API

---

## Phase 1: 基礎建設

### Task 1.1: 建立 autopilot_logs 資料表模型

**Files:**
- Create: `backend/app/models/autopilot_log.py`
- Modify: `backend/app/models/__init__.py:24-42`

**Step 1: 建立 autopilot_log.py 模型檔案**

```python
# backend/app/models/autopilot_log.py
# -*- coding: utf-8 -*-
"""
自動駕駛執行記錄模型
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ad_account import AdAccount


class AutopilotLog(Base):
    """
    自動駕駛執行記錄表

    記錄 AI 自動執行的動作，包含暫停廣告、調整預算等
    """

    __tablename__ = "autopilot_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 動作資訊
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="動作類型: pause_ad, adjust_budget, pause_creative, boost_budget",
    )
    target_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="目標類型: campaign, ad_set, ad, creative",
    )
    target_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="外部平台的 ID",
    )
    target_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="廣告名稱（方便顯示）",
    )

    # 執行細節
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="白話原因：成本超標 20%",
    )
    before_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="執行前狀態",
    )
    after_state: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="執行後狀態",
    )
    estimated_savings: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        comment="預估節省金額",
    )

    # 狀態
    status: Mapped[str] = mapped_column(
        String(20),
        default="executed",
        comment="狀態: executed, pending, failed",
    )
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        comment="執行時間",
    )

    # 關聯
    account: Mapped["AdAccount"] = relationship(
        "AdAccount",
        back_populates="autopilot_logs",
    )
```

**Step 2: 更新 models/__init__.py 加入 AutopilotLog**

在 `backend/app/models/__init__.py` 中新增：

```python
from app.models.autopilot_log import AutopilotLog
```

並在 `__all__` 列表中加入 `"AutopilotLog"`。

**Step 3: Commit**

```bash
git add backend/app/models/autopilot_log.py backend/app/models/__init__.py
git commit -m "feat(models): 新增 AutopilotLog 自動駕駛執行記錄模型"
```

---

### Task 1.2: 建立 reports 資料表模型

**Files:**
- Create: `backend/app/models/report.py`
- Modify: `backend/app/models/__init__.py`

**Step 1: 建立 report.py 模型檔案**

```python
# backend/app/models/report.py
# -*- coding: utf-8 -*-
"""
報告記錄模型
"""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Report(Base):
    """
    報告記錄表

    儲存每日/週報/月報的內容
    """

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 報告類型
    report_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="報告類型: daily, weekly, monthly",
    )
    period_start: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="報告期間開始",
    )
    period_end: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="報告期間結束",
    )

    # 報告內容
    content: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="結構化數據",
    )
    content_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="白話文字版（AI 生成）",
    )

    # 發送狀態
    sent_via: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="發送管道: line, email, web",
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="發送時間",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="建立時間",
    )

    # 關聯
    user: Mapped["User"] = relationship(
        "User",
        back_populates="reports",
    )
```

**Step 2: 更新 models/__init__.py 加入 Report**

在 `backend/app/models/__init__.py` 中新增：

```python
from app.models.report import Report
```

並在 `__all__` 列表中加入 `"Report"`。

**Step 3: Commit**

```bash
git add backend/app/models/report.py backend/app/models/__init__.py
git commit -m "feat(models): 新增 Report 報告記錄模型"
```

---

### Task 1.3: 更新 AdAccount 模型新增自動駕駛欄位

**Files:**
- Modify: `backend/app/models/ad_account.py`

**Step 1: 在 ad_account.py 新增 autopilot 欄位**

在 `AdAccount` class 中，`last_sync_at` 欄位後新增：

```python
    # 自動駕駛設定
    autopilot_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        comment="是否啟用自動駕駛",
    )
    autopilot_settings: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        default={
            "target_cpa": None,
            "monthly_budget": None,
            "goal_type": "maximize_conversions",
            "auto_pause_enabled": True,
            "auto_adjust_budget_enabled": True,
            "auto_boost_enabled": False,
            "notify_before_action": False,
        },
        comment="自動駕駛設定",
    )
```

需要在檔案頂部 import `Boolean` 和 `JSONB`：

```python
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
```

**Step 2: 新增 autopilot_logs 關聯**

在 `AdAccount` class 的關聯區域新增：

```python
    autopilot_logs: Mapped[list["AutopilotLog"]] = relationship(
        "AutopilotLog",
        back_populates="account",
        cascade="all, delete-orphan",
    )
```

並在 `TYPE_CHECKING` 區塊新增：

```python
from app.models.autopilot_log import AutopilotLog
```

**Step 3: Commit**

```bash
git add backend/app/models/ad_account.py
git commit -m "feat(models): AdAccount 新增 autopilot_enabled 和 autopilot_settings 欄位"
```

---

### Task 1.4: 更新 User 模型新增關聯

**Files:**
- Modify: `backend/app/models/user.py`

**Step 1: 在 user.py 新增 reports 關聯**

在 `User` class 的關聯區域新增：

```python
    reports: Mapped[list["Report"]] = relationship(
        "Report",
        back_populates="user",
        cascade="all, delete-orphan",
    )
```

並在 `TYPE_CHECKING` 區塊新增：

```python
from app.models.report import Report
```

**Step 2: Commit**

```bash
git add backend/app/models/user.py
git commit -m "feat(models): User 新增 reports 關聯"
```

---

### Task 1.5: 建立資料庫 Migration

**Files:**
- Create: `backend/alembic/versions/004_add_autopilot_tables.py`

**Step 1: 使用 alembic 生成 migration**

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "add_autopilot_tables"
```

**Step 2: 檢查並調整生成的 migration 檔案**

確保 migration 包含：
- 建立 `autopilot_logs` 表
- 建立 `reports` 表
- 在 `ad_accounts` 新增 `autopilot_enabled` 和 `autopilot_settings` 欄位
- 建立必要的索引

**Step 3: 執行 migration（本地測試）**

```bash
alembic upgrade head
```

**Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(db): 新增 autopilot_logs、reports 表及 ad_accounts 自動駕駛欄位"
```

---

### Task 1.6: 安裝 APScheduler 並整合到 FastAPI

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/app/core/scheduler.py`
- Modify: `backend/app/main.py`

**Step 1: 更新 requirements.txt**

在 `requirements.txt` 新增：

```
# Scheduler
APScheduler>=3.10.0,<4.0.0
```

**Step 2: 建立 scheduler.py**

```python
# backend/app/core/scheduler.py
# -*- coding: utf-8 -*-
"""
APScheduler 定時任務管理

排程：
- 每 15 分鐘：自動駕駛規則檢查
- 每天 21:00：每日摘要
- 每週一 09:00：週報生成
- 每月 1 號 09:00：月報生成
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()


async def autopilot_check_job():
    """
    自動駕駛規則檢查任務

    每 15 分鐘執行一次，檢查所有啟用自動駕駛的帳戶
    """
    from app.services.autopilot_engine import AutopilotEngine

    engine = AutopilotEngine()
    await engine.run_all_accounts()


async def daily_summary_job():
    """
    每日摘要任務

    每天 21:00 執行，生成當日摘要報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_daily_summaries()


async def weekly_report_job():
    """
    週報生成任務

    每週一 09:00 執行，生成上週報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_weekly_reports()


async def monthly_report_job():
    """
    月報生成任務

    每月 1 號 09:00 執行，生成上月報告
    """
    from app.services.report_generator import ReportGenerator

    generator = ReportGenerator()
    await generator.generate_monthly_reports()


def setup_scheduler():
    """
    設定並啟動排程器
    """
    # 每 15 分鐘執行自動駕駛檢查
    scheduler.add_job(
        autopilot_check_job,
        trigger=IntervalTrigger(minutes=15),
        id="autopilot_check",
        name="自動駕駛規則檢查",
        replace_existing=True,
    )

    # 每天 21:00 (UTC+8 = 13:00 UTC) 執行每日摘要
    scheduler.add_job(
        daily_summary_job,
        trigger=CronTrigger(hour=13, minute=0),  # UTC 時間
        id="daily_summary",
        name="每日摘要",
        replace_existing=True,
    )

    # 每週一 09:00 (UTC+8 = 01:00 UTC) 執行週報
    scheduler.add_job(
        weekly_report_job,
        trigger=CronTrigger(day_of_week="mon", hour=1, minute=0),
        id="weekly_report",
        name="週報生成",
        replace_existing=True,
    )

    # 每月 1 號 09:00 執行月報
    scheduler.add_job(
        monthly_report_job,
        trigger=CronTrigger(day=1, hour=1, minute=0),
        id="monthly_report",
        name="月報生成",
        replace_existing=True,
    )

    scheduler.start()
    print("📅 APScheduler started with jobs:")
    for job in scheduler.get_jobs():
        print(f"   - {job.name} ({job.id})")


def shutdown_scheduler():
    """
    關閉排程器
    """
    scheduler.shutdown(wait=False)
    print("📅 APScheduler shutdown")
```

**Step 3: 更新 main.py 整合 scheduler**

在 `lifespan` 函數中加入 scheduler 啟動和關閉：

```python
from app.core.scheduler import setup_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """應用程式生命週期管理"""
    # 啟動時執行
    setup_logging(level=settings.LOG_LEVEL)
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    setup_scheduler()  # 新增
    yield
    # 關閉時執行
    shutdown_scheduler()  # 新增
    print(f"👋 Shutting down {settings.APP_NAME}")
```

**Step 4: 安裝依賴並測試**

```bash
cd backend
pip install -r requirements.txt
python -c "from app.core.scheduler import scheduler; print('Scheduler imported OK')"
```

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/core/scheduler.py backend/app/main.py
git commit -m "feat(scheduler): 整合 APScheduler 定時任務系統"
```

---

### Task 1.7: 建立 AutopilotEngine 服務骨架

**Files:**
- Create: `backend/app/services/autopilot_engine.py`

**Step 1: 建立 autopilot_engine.py**

```python
# backend/app/services/autopilot_engine.py
# -*- coding: utf-8 -*-
"""
自動駕駛引擎

負責執行自動優化規則：
- 暫停成本過高的廣告
- 暫停疲勞的素材
- 調整預算分配
- 加碼表現好的廣告
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.ad_account import AdAccount
from app.models.autopilot_log import AutopilotLog

logger = logging.getLogger(__name__)


# 自動駕駛規則定義
PAUSE_RULES = [
    {
        "name": "high_cpa",
        "description": "成本超標 20% 連續 3 天",
        "check": lambda metrics, settings: (
            settings.get("target_cpa")
            and metrics.get("cpa", 0) > settings["target_cpa"] * 1.2
            and metrics.get("days_high_cpa", 0) >= 3
        ),
        "action": "pause_ad",
        "reason_template": "成本 ${cpa:.0f} 超過目標 ${target_cpa:.0f} 的 20%，連續 {days} 天",
    },
    {
        "name": "creative_fatigue",
        "description": "素材疲勞（點擊率連續下降 7 天）",
        "check": lambda metrics, settings: (
            metrics.get("ctr_trend", 0) < -0.2
            and metrics.get("days_declining", 0) >= 7
        ),
        "action": "pause_creative",
        "reason_template": "點擊率連續下降 {days} 天，疲勞度過高",
    },
    {
        "name": "low_ctr",
        "description": "點擊率過低",
        "check": lambda metrics, settings: (
            metrics.get("ctr", 0) < 0.005
            and metrics.get("impressions", 0) > 1000
            and metrics.get("days_low_ctr", 0) >= 7
        ),
        "action": "pause_ad",
        "reason_template": "點擊率僅 {ctr:.2%}，低於 0.5% 標準，連續 {days} 天",
    },
]

BOOST_RULES = [
    {
        "name": "high_roas",
        "description": "表現優異（投報率超過 4 倍）",
        "check": lambda metrics, settings: (
            settings.get("auto_boost_enabled", False)
            and metrics.get("roas", 0) > 4
            and metrics.get("spend", 0) > 1000
        ),
        "action": "increase_budget_20",
        "reason_template": "投報率達 {roas:.1f} 倍，表現優異，自動加碼 20%",
    },
]


class AutopilotEngine:
    """
    自動駕駛引擎

    負責評估和執行自動優化規則
    """

    async def run_all_accounts(self) -> dict[str, Any]:
        """
        執行所有啟用自動駕駛的帳戶

        Returns:
            執行結果統計
        """
        async with async_session_maker() as session:
            # 查詢所有啟用自動駕駛的帳戶
            stmt = select(AdAccount).where(AdAccount.autopilot_enabled == True)
            result = await session.execute(stmt)
            accounts = result.scalars().all()

            stats = {
                "total_accounts": len(accounts),
                "actions_taken": 0,
                "errors": 0,
            }

            for account in accounts:
                try:
                    actions = await self.evaluate_account(session, account)
                    stats["actions_taken"] += len(actions)
                except Exception as e:
                    logger.error(f"Error processing account {account.id}: {e}")
                    stats["errors"] += 1

            await session.commit()
            logger.info(f"Autopilot run complete: {stats}")
            return stats

    async def evaluate_account(
        self, session: AsyncSession, account: AdAccount
    ) -> list[AutopilotLog]:
        """
        評估單一帳戶的所有規則

        Args:
            session: 資料庫 session
            account: 廣告帳戶

        Returns:
            執行的動作列表
        """
        actions = []
        settings = account.autopilot_settings or {}

        # 取得帳戶的廣告數據
        # TODO: 實作從 campaigns/ads 取得 metrics
        ads_metrics = await self._get_ads_metrics(session, account)

        for ad_metrics in ads_metrics:
            # 檢查暫停規則
            if settings.get("auto_pause_enabled", True):
                for rule in PAUSE_RULES:
                    if rule["check"](ad_metrics, settings):
                        action = await self._execute_action(
                            session, account, ad_metrics, rule
                        )
                        if action:
                            actions.append(action)
                        break  # 一個廣告只執行一個暫停動作

            # 檢查加碼規則
            if settings.get("auto_boost_enabled", False):
                for rule in BOOST_RULES:
                    if rule["check"](ad_metrics, settings):
                        action = await self._execute_action(
                            session, account, ad_metrics, rule
                        )
                        if action:
                            actions.append(action)

        return actions

    async def _get_ads_metrics(
        self, session: AsyncSession, account: AdAccount
    ) -> list[dict[str, Any]]:
        """
        取得帳戶下所有廣告的 metrics

        TODO: 實作實際的數據查詢邏輯
        """
        # Placeholder: 實際需要從 campaigns/ad_sets/ads 表取得數據
        return []

    async def _execute_action(
        self,
        session: AsyncSession,
        account: AdAccount,
        metrics: dict[str, Any],
        rule: dict[str, Any],
    ) -> Optional[AutopilotLog]:
        """
        執行自動駕駛動作

        Args:
            session: 資料庫 session
            account: 廣告帳戶
            metrics: 廣告 metrics
            rule: 觸發的規則

        Returns:
            執行記錄
        """
        try:
            # 格式化原因
            reason = rule["reason_template"].format(**metrics)

            # 建立執行記錄
            log = AutopilotLog(
                ad_account_id=account.id,
                action_type=rule["action"],
                target_type=metrics.get("type", "ad"),
                target_id=metrics.get("id", "unknown"),
                target_name=metrics.get("name"),
                reason=reason,
                before_state={"status": metrics.get("status")},
                after_state={"status": "paused" if "pause" in rule["action"] else "active"},
                estimated_savings=Decimal(str(metrics.get("estimated_savings", 0))),
                status="executed",
            )

            # TODO: 實際呼叫 Google/Meta API 執行動作
            # await self._call_platform_api(account, rule["action"], metrics)

            session.add(log)
            logger.info(f"Autopilot action: {rule['action']} on {metrics.get('name')}")
            return log

        except Exception as e:
            logger.error(f"Failed to execute autopilot action: {e}")
            return None
```

**Step 2: Commit**

```bash
git add backend/app/services/autopilot_engine.py
git commit -m "feat(services): 建立 AutopilotEngine 自動駕駛引擎骨架"
```

---

### Task 1.8: 建立 ReportGenerator 服務骨架

**Files:**
- Create: `backend/app/services/report_generator.py`

**Step 1: 建立 report_generator.py**

```python
# backend/app/services/report_generator.py
# -*- coding: utf-8 -*-
"""
報告生成服務

負責生成每日摘要、週報、月報
"""

import logging
from datetime import date, datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_maker
from app.models.report import Report
from app.models.user import User

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    報告生成器

    生成白話版的廣告報告，讓老闆一看就懂
    """

    async def generate_daily_summaries(self) -> int:
        """
        生成所有用戶的每日摘要

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            # 查詢所有活躍用戶
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            today = date.today()

            for user in users:
                try:
                    report = await self._generate_daily_report(session, user, today)
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating daily report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} daily summaries")
            return count

    async def generate_weekly_reports(self) -> int:
        """
        生成所有用戶的週報

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            # 上週的日期範圍
            today = date.today()
            week_end = today - timedelta(days=today.weekday() + 1)  # 上週日
            week_start = week_end - timedelta(days=6)  # 上週一

            for user in users:
                try:
                    report = await self._generate_period_report(
                        session, user, "weekly", week_start, week_end
                    )
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating weekly report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} weekly reports")
            return count

    async def generate_monthly_reports(self) -> int:
        """
        生成所有用戶的月報

        Returns:
            生成的報告數量
        """
        async with async_session_maker() as session:
            stmt = select(User).where(User.is_active == True)
            result = await session.execute(stmt)
            users = result.scalars().all()

            count = 0
            # 上月的日期範圍
            today = date.today()
            month_end = today.replace(day=1) - timedelta(days=1)
            month_start = month_end.replace(day=1)

            for user in users:
                try:
                    report = await self._generate_period_report(
                        session, user, "monthly", month_start, month_end
                    )
                    if report:
                        session.add(report)
                        count += 1
                except Exception as e:
                    logger.error(f"Error generating monthly report for user {user.id}: {e}")

            await session.commit()
            logger.info(f"Generated {count} monthly reports")
            return count

    async def _generate_daily_report(
        self, session: AsyncSession, user: User, report_date: date
    ) -> Optional[Report]:
        """
        生成單一用戶的每日摘要

        TODO: 實作實際的數據匯總和 AI 文案生成
        """
        # 收集數據
        content = await self._collect_daily_metrics(session, user, report_date)
        if not content.get("has_data"):
            return None

        # 生成白話文字
        content_text = await self._generate_plain_text(content, "daily")

        return Report(
            user_id=user.id,
            report_type="daily",
            period_start=report_date,
            period_end=report_date,
            content=content,
            content_text=content_text,
        )

    async def _generate_period_report(
        self,
        session: AsyncSession,
        user: User,
        report_type: str,
        start_date: date,
        end_date: date,
    ) -> Optional[Report]:
        """
        生成週報/月報
        """
        content = await self._collect_period_metrics(session, user, start_date, end_date)
        if not content.get("has_data"):
            return None

        content_text = await self._generate_plain_text(content, report_type)

        return Report(
            user_id=user.id,
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            content=content,
            content_text=content_text,
        )

    async def _collect_daily_metrics(
        self, session: AsyncSession, user: User, report_date: date
    ) -> dict[str, Any]:
        """
        收集每日 metrics

        TODO: 實作實際的數據查詢
        """
        # Placeholder
        return {
            "has_data": False,
            "spend": 0,
            "conversions": 0,
            "revenue": 0,
            "roas": 0,
        }

    async def _collect_period_metrics(
        self, session: AsyncSession, user: User, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """
        收集期間 metrics

        TODO: 實作實際的數據查詢
        """
        # Placeholder
        return {
            "has_data": False,
            "spend": 0,
            "conversions": 0,
            "revenue": 0,
            "roas": 0,
        }

    async def _generate_plain_text(
        self, content: dict[str, Any], report_type: str
    ) -> str:
        """
        使用 AI 生成白話報告文字

        TODO: 整合 OpenAI API
        """
        # Placeholder
        spend = content.get("spend", 0)
        conversions = content.get("conversions", 0)
        roas = content.get("roas", 0)

        if report_type == "daily":
            return f"今日花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
        elif report_type == "weekly":
            return f"本週花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
        else:
            return f"本月花費 ${spend:,.0f}，帶來 {conversions} 筆訂單，投報率 {roas:.1f} 倍。"
```

**Step 2: Commit**

```bash
git add backend/app/services/report_generator.py
git commit -m "feat(services): 建立 ReportGenerator 報告生成服務骨架"
```

---

## Phase 2: 前端重構

### Task 2.1: 更新側邊欄導航

**Files:**
- Modify: `components/nav/sidebar.tsx`

**Step 1: 更新 navItems 導航項目**

將 `sidebar.tsx` 中的 `navItems` 改為：

```typescript
import {
  LayoutDashboard,
  Car,
  Sparkles,
  FileText,
  Link2,
  Settings,
  LogOut,
  Sun,
  Moon,
  Ship,
} from 'lucide-react';

const navItems: NavItem[] = [
  { href: '/dashboard', label: '首頁', icon: LayoutDashboard },
  { href: '/autopilot', label: '自動駕駛', icon: Car },
  { href: '/ai-studio', label: 'AI 創作', icon: Sparkles },
  { href: '/reports', label: '報告', icon: FileText },
  { href: '/accounts', label: '帳號連接', icon: Link2 },
];
```

**Step 2: Commit**

```bash
git add components/nav/sidebar.tsx
git commit -m "refactor(nav): 更新側邊欄導航為 SDD v2.0 結構"
```

---

### Task 2.2: 重構首頁儀表板 - 簡化指標卡片

**Files:**
- Create: `components/dashboard/simple-metric-card.tsx`
- Modify: `components/dashboard/dashboard-metrics.tsx`

**Step 1: 建立 simple-metric-card.tsx**

```typescript
// components/dashboard/simple-metric-card.tsx
'use client';

import { cn } from '@/lib/utils';

interface SimpleMetricCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  status?: 'good' | 'warning' | 'bad';
}

const statusColors = {
  good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  bad: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SimpleMetricCard({
  icon,
  title,
  value,
  subtitle,
  status,
}: SimpleMetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </div>
      {subtitle && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
          {status && (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                statusColors[status]
              )}
            >
              {status === 'good' ? '良好' : status === 'warning' ? '注意' : '問題'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: 更新 dashboard-metrics.tsx**

將 `dashboard-metrics.tsx` 改為只顯示 3 個核心指標：

```typescript
// components/dashboard/dashboard-metrics.tsx
'use client';

import { useDashboardOverview } from '@/hooks/use-dashboard-overview';
import { SimpleMetricCard } from './simple-metric-card';
import type { TimePeriod } from '@/lib/api/types';

interface DashboardMetricsProps {
  period?: TimePeriod;
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardMetrics({ period = '30d' }: DashboardMetricsProps) {
  const { data, isLoading, error } = useDashboardOverview(period);

  if (isLoading) {
    return <MetricsSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">
          載入數據時發生錯誤: {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-gray-500 dark:text-gray-400">尚無數據</p>
      </div>
    );
  }

  const { metrics } = data;
  const budgetPercent = 100 - (metrics.spend.value / 50000) * 100; // 假設預算 50000
  const cpa = metrics.conversions.value > 0
    ? metrics.spend.value / metrics.conversions.value
    : 0;

  // 判斷 ROAS 狀態
  const roasStatus = metrics.roas.value >= 3 ? 'good' : metrics.roas.value >= 2 ? 'warning' : 'bad';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SimpleMetricCard
        icon="💰"
        title="已花費"
        value={`$${metrics.spend.value.toLocaleString()}`}
        subtitle={`預算剩 ${budgetPercent.toFixed(0)}%`}
      />
      <SimpleMetricCard
        icon="📦"
        title="訂單數"
        value={`${metrics.conversions.value} 筆`}
        subtitle={`每筆 $${cpa.toFixed(0)}`}
      />
      <SimpleMetricCard
        icon="📈"
        title="投報率"
        value={`${metrics.roas.value.toFixed(1)} 倍`}
        subtitle="每花 1 元賺回"
        status={roasStatus}
      />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/dashboard/simple-metric-card.tsx components/dashboard/dashboard-metrics.tsx
git commit -m "refactor(dashboard): 簡化儀表板指標卡片為 3 個核心指標"
```

---

### Task 2.3: 重構首頁 - 新增自動駕駛狀態和 AI 執行記錄

**Files:**
- Create: `components/dashboard/autopilot-status.tsx`
- Create: `components/dashboard/ai-actions-list.tsx`
- Create: `components/dashboard/pending-decisions.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Step 1: 建立 autopilot-status.tsx**

```typescript
// components/dashboard/autopilot-status.tsx
'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AutopilotStatusProps {
  enabled: boolean;
  targetCpa?: number;
  monthlyBudget?: number;
  daysSinceStart?: number;
  totalSavings?: number;
}

export function AutopilotStatus({
  enabled,
  targetCpa,
  monthlyBudget,
  daysSinceStart = 0,
  totalSavings = 0,
}: AutopilotStatusProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚗</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                自動駕駛：
              </span>
              {enabled ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  🟢 運作中
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  ⚪ 未啟用
                </span>
              )}
            </div>
            {enabled && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {targetCpa && `目標：每筆訂單 < $${targetCpa.toLocaleString()}`}
                {targetCpa && monthlyBudget && ' ｜ '}
                {monthlyBudget && `本月預算 $${monthlyBudget.toLocaleString()}`}
              </div>
            )}
            {enabled && daysSinceStart > 0 && (
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                已連續運作 {daysSinceStart} 天，幫你省下 ${totalSavings.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <Link href="/autopilot">
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            設定
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

**Step 2: 建立 ai-actions-list.tsx**

```typescript
// components/dashboard/ai-actions-list.tsx
'use client';

import Link from 'next/link';

interface AIAction {
  id: string;
  date: string;
  action: string;
  reason: string;
  savings?: number;
  earnings?: number;
}

interface AIActionsListProps {
  actions: AIAction[];
}

export function AIActionsList({ actions }: AIActionsListProps) {
  if (actions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>⚡</span> AI 最近幫你做了這些事
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          啟用自動駕駛後，AI 會自動幫你優化廣告
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>⚡</span> AI 最近幫你做了這些事
      </h2>
      <div className="space-y-3">
        {actions.slice(0, 5).map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                {action.date}
              </span>
              <span className="text-gray-900 dark:text-white">
                {action.action}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                - {action.reason}
              </span>
            </div>
            <div className="text-right">
              {action.savings && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  省下 ${action.savings.toLocaleString()}
                </span>
              )}
              {action.earnings && (
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  多賺 ${action.earnings.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {actions.length > 5 && (
        <div className="mt-4 text-right">
          <Link
            href="/autopilot?tab=logs"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            查看完整記錄 →
          </Link>
        </div>
      )}
    </div>
  );
}
```

**Step 3: 建立 pending-decisions.tsx**

```typescript
// components/dashboard/pending-decisions.tsx
'use client';

import { Button } from '@/components/ui/button';

interface PendingDecision {
  id: string;
  type: string;
  title: string;
  description: string;
  options: { label: string; value: string }[];
}

interface PendingDecisionsProps {
  decisions: PendingDecision[];
  onDecide: (decisionId: string, value: string) => void;
}

export function PendingDecisions({ decisions, onDecide }: PendingDecisionsProps) {
  if (decisions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>⚠️</span> 需要你決定（{decisions.length}）
      </h2>
      <div className="space-y-4">
        {decisions.map((decision) => (
          <div
            key={decision.id}
            className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">📢</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {decision.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {decision.description}
                </p>
                <div className="flex gap-2 mt-4">
                  {decision.options.map((option) => (
                    <Button
                      key={option.value}
                      variant={option.value === 'ignore' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => onDecide(decision.id, option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: 更新 dashboard/page.tsx**

```typescript
// app/(dashboard)/dashboard/page.tsx
'use client';

import { useState } from 'react';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { AutopilotStatus } from '@/components/dashboard/autopilot-status';
import { AIActionsList } from '@/components/dashboard/ai-actions-list';
import { PendingDecisions } from '@/components/dashboard/pending-decisions';

// Mock data - 之後會從 API 取得
const mockAutopilot = {
  enabled: true,
  targetCpa: 500,
  monthlyBudget: 50000,
  daysSinceStart: 15,
  totalSavings: 12400,
};

const mockActions = [
  {
    id: '1',
    date: '1/22',
    action: '暫停「測試廣告 A」',
    reason: '成本過高',
    savings: 2100,
  },
  {
    id: '2',
    date: '1/20',
    action: '加碼「熱銷商品」+20%',
    reason: '表現優異',
    earnings: 8500,
  },
  {
    id: '3',
    date: '1/18',
    action: '暫停 3 個疲勞素材',
    reason: '點擊率下降',
    savings: 1800,
  },
];

const mockDecisions = [
  {
    id: '1',
    type: 'budget_increase',
    title: '預算即將用完',
    description: '本月預算剩 $17,550（35%），預計 5 天後用完。以目前表現，建議加碼 $20,000 可多帶來約 40 筆訂單。',
    options: [
      { label: '不用了', value: 'ignore' },
      { label: '加碼 $10,000', value: 'add_10000' },
      { label: '加碼 $20,000', value: 'add_20000' },
    ],
  },
];

export default function DashboardPage() {
  const [decisions, setDecisions] = useState(mockDecisions);

  const handleDecide = (decisionId: string, value: string) => {
    // TODO: 呼叫 API 處理決策
    console.log('Decision:', decisionId, value);
    setDecisions((prev) => prev.filter((d) => d.id !== decisionId));
  };

  // 取得當前日期
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}（${['日', '一', '二', '三', '四', '五', '六'][today.getDay()]}）`;

  return (
    <div className="space-y-6">
      {/* 歡迎標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          👋 嗨，老闆
        </h1>
        <span className="text-gray-500 dark:text-gray-400">
          今天 {dateStr}
        </span>
      </div>

      {/* 自動駕駛狀態 */}
      <AutopilotStatus {...mockAutopilot} />

      {/* 本月指標 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 本月到目前為止
        </h2>
        <DashboardMetrics period="30d" />
      </div>

      {/* AI 執行記錄 */}
      <AIActionsList actions={mockActions} />

      {/* 待決定事項 */}
      <PendingDecisions decisions={decisions} onDecide={handleDecide} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add components/dashboard/autopilot-status.tsx components/dashboard/ai-actions-list.tsx components/dashboard/pending-decisions.tsx app/\(dashboard\)/dashboard/page.tsx
git commit -m "refactor(dashboard): 重構首頁為 SDD v2.0 簡化設計"
```

---

### Task 2.4: 建立自動駕駛設定頁面

**Files:**
- Create: `app/(dashboard)/autopilot/page.tsx`

**Step 1: 建立 autopilot/page.tsx**

```typescript
// app/(dashboard)/autopilot/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AutopilotSettings {
  enabled: boolean;
  goalType: 'maximize_conversions' | 'maximize_revenue' | 'minimize_cost';
  targetCpa: number | null;
  monthlyBudget: number | null;
  autoPauseEnabled: boolean;
  autoAdjustBudgetEnabled: boolean;
  autoBoostEnabled: boolean;
}

const mockSettings: AutopilotSettings = {
  enabled: true,
  goalType: 'maximize_conversions',
  targetCpa: 500,
  monthlyBudget: 50000,
  autoPauseEnabled: true,
  autoAdjustBudgetEnabled: true,
  autoBoostEnabled: false,
};

const mockLogs = [
  { id: '1', date: '1/22 14:30', action: '暫停「測試廣告 A」', savings: 2100 },
  { id: '2', date: '1/20 09:15', action: '加碼「熱銷商品」+20%', earnings: 8500 },
  { id: '3', date: '1/18 16:45', action: '暫停 3 個疲勞素材', savings: 1800 },
];

export default function AutopilotPage() {
  const [settings, setSettings] = useState(mockSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: 呼叫 API 儲存設定
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const totalSavings = mockLogs.reduce((sum, log) => sum + (log.savings || 0), 0);

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🚗 自動駕駛
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          設定目標後，AI 會自動幫你優化廣告
        </p>
      </div>

      {/* 狀態卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">
              {settings.enabled ? '🟢' : '⚪'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                狀態：{settings.enabled ? '運作中' : '未啟用'}
              </h2>
              {settings.enabled && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  已連續運作 15 天，幫你省下 ${totalSavings.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={settings.enabled ? 'outline' : 'default'}
            onClick={() =>
              setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
          >
            {settings.enabled ? '暫停' : '啟用'}
          </Button>
        </div>
      </div>

      {/* 目標設定 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          🎯 目標設定
        </h2>

        <div className="space-y-6">
          {/* 目標類型 */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              目標類型
            </Label>
            <div className="space-y-2">
              {[
                { value: 'maximize_conversions', label: '最大化訂單數量' },
                { value: 'maximize_revenue', label: '最大化營收' },
                { value: 'minimize_cost', label: '控制成本為主' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="goalType"
                    value={option.value}
                    checked={settings.goalType === option.value}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        goalType: e.target.value as AutopilotSettings['goalType'],
                      }))
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900 dark:text-white">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 每筆訂單成本上限 */}
          <div>
            <Label
              htmlFor="targetCpa"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              每筆訂單成本上限
            </Label>
            <div className="relative w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                NT$
              </span>
              <input
                id="targetCpa"
                type="number"
                value={settings.targetCpa || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    targetCpa: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="500"
              />
            </div>
          </div>

          {/* 每月預算上限 */}
          <div>
            <Label
              htmlFor="monthlyBudget"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              每月預算上限
            </Label>
            <div className="relative w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                NT$
              </span>
              <input
                id="monthlyBudget"
                type="number"
                value={settings.monthlyBudget || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    monthlyBudget: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="50000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 自動執行權限 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          ⚙️ 自動執行權限
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動暫停成本過高的廣告
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當廣告成本超過目標 20% 連續 3 天
              </p>
            </div>
            <Switch
              checked={settings.autoPauseEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoPauseEnabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動暫停疲勞的素材
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當素材點擊率連續下降 7 天
              </p>
            </div>
            <Switch
              checked={settings.autoPauseEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoPauseEnabled: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動調整預算分配
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                把預算從差的廣告移到好的廣告
              </p>
            </div>
            <Switch
              checked={settings.autoAdjustBudgetEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  autoAdjustBudgetEnabled: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                自動加碼表現好的廣告
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                當廣告投報率 &gt; 4 倍，自動增加 20% 預算
              </p>
            </div>
            <Switch
              checked={settings.autoBoostEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, autoBoostEnabled: checked }))
              }
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </div>

      {/* 最近執行記錄 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📜 最近執行記錄
        </h2>

        <div className="space-y-3">
          {mockLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-24">
                  {log.date}
                </span>
                <span className="text-gray-900 dark:text-white">
                  {log.action}
                </span>
              </div>
              <div>
                {log.savings && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    省下 ${log.savings.toLocaleString()}
                  </span>
                )}
                {log.earnings && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    預估多賺 ${log.earnings.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/autopilot/page.tsx
git commit -m "feat(pages): 新增自動駕駛設定頁面"
```

---

### Task 2.5: 建立 AI 創作頁面

**Files:**
- Create: `app/(dashboard)/ai-studio/page.tsx`

**Step 1: 建立 ai-studio/page.tsx**

```typescript
// app/(dashboard)/ai-studio/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Image, Copy, RefreshCw, Lock } from 'lucide-react';

interface GeneratedCopy {
  id: string;
  date: string;
  productName: string;
  headlines: string[];
  descriptions: string[];
}

const mockHistory: GeneratedCopy[] = [
  {
    id: '1',
    date: '1/22',
    productName: '春季促銷',
    headlines: ['限時特惠！全館商品 8 折起', '春季大促銷，把握機會'],
    descriptions: [
      '把握機會，錯過再等一年。精選商品限時優惠中！',
      '春暖花開，好物特惠。立即選購享獨家折扣。',
    ],
  },
];

export default function AIStudioPage() {
  const [productDescription, setProductDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);
  const [usageCount] = useState(5);
  const usageLimit = 20;

  const handleGenerate = async () => {
    if (!productDescription.trim()) return;

    setIsGenerating(true);
    // TODO: 呼叫 API 生成文案
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setGeneratedCopy({
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      productName: productDescription.slice(0, 20),
      headlines: [
        '限時優惠！' + productDescription.slice(0, 10) + '特價中',
        productDescription.slice(0, 10) + ' - 品質保證，價格實惠',
      ],
      descriptions: [
        '精選' + productDescription.slice(0, 15) + '，限時特惠中。立即選購，享受最優惠價格！',
        '想要' + productDescription.slice(0, 10) + '？現在正是最佳時機。品質保證，售後無憂。',
      ],
    });
    setIsGenerating(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 顯示複製成功提示
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ✨ AI 創作
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          讓 AI 幫你生成廣告文案和素材
        </p>
      </div>

      {/* 功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 文案生成 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                文案生成
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                讓 AI 幫你寫廣告標題和描述
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              本月已用：{usageCount}/{usageLimit} 組
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${(usageCount / usageLimit) * 100}%` }}
              />
            </div>
          </div>

          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="描述你的商品或服務...&#10;例如：手工皂禮盒，天然植物萃取，適合送禮"
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none mb-4"
          />

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !productDescription.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                開始生成
              </>
            )}
          </Button>
        </div>

        {/* 圖片生成（鎖定） */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gray-900/5 dark:bg-gray-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                升級解鎖
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                素材包 +$1,990/月
              </p>
              <Button variant="outline" size="sm">
                了解更多
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                圖片生成
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                讓 AI 幫你做廣告圖片
              </p>
            </div>
          </div>

          <p className="text-gray-500 dark:text-gray-400">
            10 張/月
          </p>
        </div>
      </div>

      {/* 生成結果 */}
      {generatedCopy && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              生成結果
            </h2>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="w-4 h-4 mr-1" />
              重新生成
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                標題
              </h3>
              {generatedCopy.headlines.map((headline, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2"
                >
                  <span className="text-gray-900 dark:text-white">{headline}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(headline)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                描述
              </h3>
              {generatedCopy.descriptions.map((desc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2"
                >
                  <span className="text-gray-900 dark:text-white text-sm">
                    {desc}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(desc)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 歷史記錄 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 最近生成的內容
        </h2>

        {mockHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            尚無生成記錄
          </p>
        ) : (
          <div className="space-y-4">
            {mockHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.date} - {item.productName}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  標題：{item.headlines[0]}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.descriptions[0].slice(0, 50)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/ai-studio/page.tsx
git commit -m "feat(pages): 新增 AI 創作頁面（文案生成 + 圖片生成預留）"
```

---

### Task 2.6: 建立報告列表頁面

**Files:**
- Create: `app/(dashboard)/reports/page.tsx`

**Step 1: 建立 reports/page.tsx**

```typescript
// app/(dashboard)/reports/page.tsx
'use client';

import { useState } from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Report {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  summary: {
    spend: number;
    conversions: number;
    roas: number;
  };
  createdAt: string;
}

const mockReports: Report[] = [
  {
    id: '1',
    type: 'weekly',
    periodStart: '2026-01-13',
    periodEnd: '2026-01-19',
    summary: { spend: 28500, conversions: 52, roas: 3.6 },
    createdAt: '2026-01-20',
  },
  {
    id: '2',
    type: 'weekly',
    periodStart: '2026-01-06',
    periodEnd: '2026-01-12',
    summary: { spend: 31200, conversions: 61, roas: 4.1 },
    createdAt: '2026-01-13',
  },
  {
    id: '3',
    type: 'monthly',
    periodStart: '2025-12-01',
    periodEnd: '2025-12-31',
    summary: { spend: 125000, conversions: 245, roas: 3.8 },
    createdAt: '2026-01-01',
  },
];

const typeLabels = {
  daily: '每日摘要',
  weekly: '週報',
  monthly: '月報',
};

const typeColors = {
  daily: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function ReportsPage() {
  const [filter, setFilter] = useState<'all' | 'weekly' | 'monthly'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const filteredReports = mockReports.filter(
    (report) => filter === 'all' || report.type === filter
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatPeriod = (report: Report) => {
    if (report.type === 'daily') {
      return formatDate(report.periodStart);
    }
    return `${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}`;
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          📊 報告
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          查看週報和月報，了解廣告表現
        </p>
      </div>

      {/* 篩選器 */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: '全部' },
          { value: 'weekly', label: '週報' },
          { value: 'monthly', label: '月報' },
        ].map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(option.value as typeof filter)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* 報告列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              尚無報告
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        typeColors[report.type]
                      }`}
                    >
                      {typeLabels[report.type]}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatPeriod(report)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        花費 ${report.summary.spend.toLocaleString()} ・
                        訂單 {report.summary.conversions} 筆 ・
                        投報率 {report.summary.roas.toFixed(1)} 倍
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 報告詳情 Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      typeColors[selectedReport.type]
                    }`}
                  >
                    {typeLabels[selectedReport.type]}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatPeriod(selectedReport)}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReport(null)}
                >
                  關閉
                </Button>
              </div>

              {/* 報告內容 */}
              <div className="space-y-6">
                {/* 摘要 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      💰 花費
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${selectedReport.summary.spend.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📦 訂單
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedReport.summary.conversions} 筆
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📈 投報率
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedReport.summary.roas.toFixed(1)} 倍
                    </p>
                  </div>
                </div>

                {/* 白話報告（placeholder） */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-gray-900 dark:text-white leading-relaxed">
                    這{selectedReport.type === 'weekly' ? '週' : '個月'}花了 $
                    {selectedReport.summary.spend.toLocaleString()}，帶來{' '}
                    {selectedReport.summary.conversions} 筆訂單 📦
                    <br />
                    <br />
                    每筆訂單成本 $
                    {Math.round(
                      selectedReport.summary.spend /
                        selectedReport.summary.conversions
                    ).toLocaleString()}
                    ，投報率 {selectedReport.summary.roas.toFixed(1)} 倍，表現
                    {selectedReport.summary.roas >= 3 ? '不錯' : '還可以'}！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/reports/page.tsx
git commit -m "feat(pages): 新增報告列表頁面"
```

---

### Task 2.7: 移除舊頁面

**Files:**
- Delete: `app/(dashboard)/creatives/`
- Delete: `app/(dashboard)/audiences/`
- Delete: `app/(dashboard)/health/`
- Delete: `app/(dashboard)/actions/`

**Step 1: 刪除舊頁面目錄**

```bash
rm -rf app/\(dashboard\)/creatives
rm -rf app/\(dashboard\)/audiences
rm -rf app/\(dashboard\)/health
rm -rf app/\(dashboard\)/actions
```

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor(pages): 移除舊頁面（素材、受眾、健檢、行動中心）"
```

---

## Phase 3: 核心功能

### Task 3.1: 建立 Autopilot API Router

**Files:**
- Create: `backend/app/routers/autopilot.py`
- Modify: `backend/app/routers/__init__.py`

**Step 1: 建立 autopilot.py router**

```python
# backend/app/routers/autopilot.py
# -*- coding: utf-8 -*-
"""
自動駕駛 API 路由
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_async_session
from app.models.ad_account import AdAccount
from app.models.autopilot_log import AutopilotLog
from app.models.user import User

router = APIRouter()


class AutopilotSettingsSchema(BaseModel):
    """自動駕駛設定 Schema"""
    target_cpa: Optional[float] = None
    monthly_budget: Optional[float] = None
    goal_type: str = "maximize_conversions"
    auto_pause_enabled: bool = True
    auto_adjust_budget_enabled: bool = True
    auto_boost_enabled: bool = False
    notify_before_action: bool = False


class AutopilotStatusResponse(BaseModel):
    """自動駕駛狀態回應"""
    enabled: bool
    settings: AutopilotSettingsSchema
    stats: dict


class AutopilotLogResponse(BaseModel):
    """執行記錄回應"""
    id: UUID
    action_type: str
    target_name: Optional[str]
    reason: str
    estimated_savings: Optional[float]
    executed_at: str


@router.get("/settings")
async def get_autopilot_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> AutopilotStatusResponse:
    """
    取得自動駕駛設定
    """
    # 取得用戶的第一個廣告帳戶（簡化版）
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        return AutopilotStatusResponse(
            enabled=False,
            settings=AutopilotSettingsSchema(),
            stats={"total_savings": 0, "actions_count": 0, "days_running": 0},
        )

    settings = account.autopilot_settings or {}

    # 計算統計數據
    logs_stmt = select(AutopilotLog).where(AutopilotLog.ad_account_id == account.id)
    logs_result = await session.execute(logs_stmt)
    logs = logs_result.scalars().all()

    total_savings = sum(float(log.estimated_savings or 0) for log in logs)

    return AutopilotStatusResponse(
        enabled=account.autopilot_enabled,
        settings=AutopilotSettingsSchema(**settings),
        stats={
            "total_savings": total_savings,
            "actions_count": len(logs),
            "days_running": 15,  # TODO: 計算實際天數
        },
    )


@router.put("/settings")
async def update_autopilot_settings(
    settings: AutopilotSettingsSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    更新自動駕駛設定
    """
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到廣告帳戶",
        )

    account.autopilot_settings = settings.model_dump()
    await session.commit()

    return {"message": "設定已更新"}


@router.post("/toggle")
async def toggle_autopilot(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    啟用/停用自動駕駛
    """
    stmt = select(AdAccount).where(AdAccount.user_id == current_user.id).limit(1)
    result = await session.execute(stmt)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到廣告帳戶",
        )

    account.autopilot_enabled = not account.autopilot_enabled
    await session.commit()

    return {
        "enabled": account.autopilot_enabled,
        "message": "自動駕駛已" + ("啟用" if account.autopilot_enabled else "停用"),
    }


@router.get("/logs")
async def get_autopilot_logs(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[AutopilotLogResponse]:
    """
    取得自動駕駛執行記錄
    """
    # 取得用戶的帳戶
    accounts_stmt = select(AdAccount.id).where(AdAccount.user_id == current_user.id)
    accounts_result = await session.execute(accounts_stmt)
    account_ids = [row[0] for row in accounts_result.all()]

    if not account_ids:
        return []

    # 取得執行記錄
    logs_stmt = (
        select(AutopilotLog)
        .where(AutopilotLog.ad_account_id.in_(account_ids))
        .order_by(AutopilotLog.executed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(logs_stmt)
    logs = result.scalars().all()

    return [
        AutopilotLogResponse(
            id=log.id,
            action_type=log.action_type,
            target_name=log.target_name,
            reason=log.reason,
            estimated_savings=float(log.estimated_savings) if log.estimated_savings else None,
            executed_at=log.executed_at.isoformat(),
        )
        for log in logs
    ]
```

**Step 2: 更新 routers/__init__.py**

在 `__init__.py` 中加入：

```python
from app.routers import autopilot

# 自動駕駛路由
api_router.include_router(
    autopilot.router,
    prefix="/autopilot",
    tags=["Autopilot"],
)
```

**Step 3: Commit**

```bash
git add backend/app/routers/autopilot.py backend/app/routers/__init__.py
git commit -m "feat(api): 新增自動駕駛 API 路由"
```

---

### Task 3.2: 建立 Reports API Router

**Files:**
- Create: `backend/app/routers/reports.py`
- Modify: `backend/app/routers/__init__.py`

**Step 1: 建立 reports.py router**

```python
# backend/app/routers/reports.py
# -*- coding: utf-8 -*-
"""
報告 API 路由
"""

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_async_session
from app.models.report import Report
from app.models.user import User

router = APIRouter()


class ReportSummary(BaseModel):
    """報告摘要"""
    spend: float
    conversions: int
    revenue: float
    roas: float


class ReportListItem(BaseModel):
    """報告列表項目"""
    id: UUID
    report_type: str
    period_start: date
    period_end: date
    summary: ReportSummary
    created_at: str


class ReportDetail(BaseModel):
    """報告詳情"""
    id: UUID
    report_type: str
    period_start: date
    period_end: date
    content: dict
    content_text: Optional[str]
    created_at: str


@router.get("")
async def list_reports(
    report_type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[ReportListItem]:
    """
    取得報告列表
    """
    stmt = select(Report).where(Report.user_id == current_user.id)

    if report_type:
        stmt = stmt.where(Report.report_type == report_type)

    stmt = stmt.order_by(Report.period_start.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    reports = result.scalars().all()

    return [
        ReportListItem(
            id=report.id,
            report_type=report.report_type,
            period_start=report.period_start,
            period_end=report.period_end,
            summary=ReportSummary(
                spend=report.content.get("spend", 0),
                conversions=report.content.get("conversions", 0),
                revenue=report.content.get("revenue", 0),
                roas=report.content.get("roas", 0),
            ),
            created_at=report.created_at.isoformat(),
        )
        for report in reports
    ]


@router.get("/{report_id}")
async def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
) -> ReportDetail:
    """
    取得報告詳情
    """
    stmt = select(Report).where(
        Report.id == report_id,
        Report.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到報告",
        )

    return ReportDetail(
        id=report.id,
        report_type=report.report_type,
        period_start=report.period_start,
        period_end=report.period_end,
        content=report.content,
        content_text=report.content_text,
        created_at=report.created_at.isoformat(),
    )
```

**Step 2: 更新 routers/__init__.py**

```python
from app.routers import reports

# 報告路由
api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
)
```

**Step 3: Commit**

```bash
git add backend/app/routers/reports.py backend/app/routers/__init__.py
git commit -m "feat(api): 新增報告 API 路由"
```

---

### Task 3.3: 建立前端 API Hooks

**Files:**
- Create: `hooks/use-autopilot.ts`
- Create: `hooks/use-reports.ts`

**Step 1: 建立 use-autopilot.ts**

```typescript
// hooks/use-autopilot.ts
'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';

interface AutopilotSettings {
  target_cpa: number | null;
  monthly_budget: number | null;
  goal_type: string;
  auto_pause_enabled: boolean;
  auto_adjust_budget_enabled: boolean;
  auto_boost_enabled: boolean;
  notify_before_action: boolean;
}

interface AutopilotStatus {
  enabled: boolean;
  settings: AutopilotSettings;
  stats: {
    total_savings: number;
    actions_count: number;
    days_running: number;
  };
}

interface AutopilotLog {
  id: string;
  action_type: string;
  target_name: string | null;
  reason: string;
  estimated_savings: number | null;
  executed_at: string;
}

const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

export function useAutopilotSettings() {
  const { data, error, isLoading, mutate } = useSWR<AutopilotStatus>(
    '/autopilot/settings',
    fetcher
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

export function useAutopilotLogs(limit = 20) {
  const { data, error, isLoading, mutate } = useSWR<AutopilotLog[]>(
    `/autopilot/logs?limit=${limit}`,
    fetcher
  );

  return {
    logs: data || [],
    error,
    isLoading,
    mutate,
  };
}

export async function updateAutopilotSettings(settings: AutopilotSettings) {
  const response = await apiClient.put('/autopilot/settings', settings);
  return response.data;
}

export async function toggleAutopilot() {
  const response = await apiClient.post('/autopilot/toggle');
  return response.data;
}
```

**Step 2: 建立 use-reports.ts**

```typescript
// hooks/use-reports.ts
'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';

interface ReportSummary {
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
}

interface ReportListItem {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: ReportSummary;
  created_at: string;
}

interface ReportDetail {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  content: Record<string, unknown>;
  content_text: string | null;
  created_at: string;
}

const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data;
};

export function useReports(reportType?: string) {
  const url = reportType
    ? `/reports?report_type=${reportType}`
    : '/reports';

  const { data, error, isLoading, mutate } = useSWR<ReportListItem[]>(
    url,
    fetcher
  );

  return {
    reports: data || [],
    error,
    isLoading,
    mutate,
  };
}

export function useReport(reportId: string) {
  const { data, error, isLoading } = useSWR<ReportDetail>(
    reportId ? `/reports/${reportId}` : null,
    fetcher
  );

  return {
    report: data,
    error,
    isLoading,
  };
}
```

**Step 3: Commit**

```bash
git add hooks/use-autopilot.ts hooks/use-reports.ts
git commit -m "feat(hooks): 新增 useAutopilot 和 useReports hooks"
```

---

## Phase 4: AI 創作

### Task 4.1: 建立 AI Copywriting API

**Files:**
- Create: `backend/app/routers/ai_copywriting.py`
- Create: `backend/app/services/ai_copywriting_service.py`
- Modify: `backend/app/routers/__init__.py`

**Step 1: 建立 ai_copywriting_service.py**

```python
# backend/app/services/ai_copywriting_service.py
# -*- coding: utf-8 -*-
"""
AI 文案生成服務
"""

import logging
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AICopywritingService:
    """
    AI 文案生成服務

    使用 OpenAI API 生成廣告文案
    """

    def __init__(self):
        self.api_key = getattr(settings, 'OPENAI_API_KEY', None)
        self.model = "gpt-4o-mini"

    async def generate_copy(
        self,
        product_description: str,
        style: str = "professional",
        language: str = "zh-TW",
    ) -> dict:
        """
        生成廣告文案

        Args:
            product_description: 商品/服務描述
            style: 文案風格
            language: 語言

        Returns:
            包含標題和描述的字典
        """
        if not self.api_key:
            # 沒有 API key 時返回模擬結果
            return self._generate_mock_copy(product_description)

        prompt = f"""你是一位專業的廣告文案撰寫專家。請根據以下商品描述，生成 2 組廣告文案。

商品描述：{product_description}

請生成：
1. 2 個廣告標題（每個不超過 30 個字）
2. 2 個廣告描述（每個不超過 90 個字）

要求：
- 使用繁體中文
- 語氣{style}
- 突出商品優勢
- 包含行動呼籲

請以 JSON 格式回覆：
{{
    "headlines": ["標題1", "標題2"],
    "descriptions": ["描述1", "描述2"]
}}"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                    },
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                import json
                content = data["choices"][0]["message"]["content"]
                # 嘗試解析 JSON
                result = json.loads(content)
                return result

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return self._generate_mock_copy(product_description)

    def _generate_mock_copy(self, product_description: str) -> dict:
        """
        生成模擬文案（開發用）
        """
        short_desc = product_description[:15] if product_description else "優質商品"

        return {
            "headlines": [
                f"限時優惠！{short_desc}特價中",
                f"{short_desc} - 品質保證，價格實惠",
            ],
            "descriptions": [
                f"精選{short_desc}，限時特惠中。立即選購，享受最優惠價格！品質保證，售後無憂。",
                f"想要{short_desc}？現在正是最佳時機。專業品質，貼心服務，讓您購物更安心。",
            ],
        }
```

**Step 2: 建立 ai_copywriting.py router**

```python
# backend/app/routers/ai_copywriting.py
# -*- coding: utf-8 -*-
"""
AI 文案生成 API 路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.user import User
from app.services.ai_copywriting_service import AICopywritingService

router = APIRouter()


class CopywritingRequest(BaseModel):
    """文案生成請求"""
    product_description: str
    style: str = "professional"


class CopywritingResponse(BaseModel):
    """文案生成回應"""
    headlines: list[str]
    descriptions: list[str]


@router.post("/copywriting")
async def generate_copywriting(
    request: CopywritingRequest,
    current_user: User = Depends(get_current_user),
) -> CopywritingResponse:
    """
    生成廣告文案
    """
    if not request.product_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="請提供商品描述",
        )

    # TODO: 檢查用戶用量限制
    # if current_user.ai_copywriting_count >= 20:
    #     raise HTTPException(
    #         status_code=status.HTTP_429_TOO_MANY_REQUESTS,
    #         detail="本月文案生成次數已達上限",
    #     )

    service = AICopywritingService()
    result = await service.generate_copy(
        product_description=request.product_description,
        style=request.style,
    )

    # TODO: 更新用戶用量
    # current_user.ai_copywriting_count += 1

    return CopywritingResponse(
        headlines=result.get("headlines", []),
        descriptions=result.get("descriptions", []),
    )
```

**Step 3: 更新 routers/__init__.py**

```python
from app.routers import ai_copywriting

# AI 文案生成路由
api_router.include_router(
    ai_copywriting.router,
    prefix="/ai",
    tags=["AI"],
)
```

**Step 4: Commit**

```bash
git add backend/app/services/ai_copywriting_service.py backend/app/routers/ai_copywriting.py backend/app/routers/__init__.py
git commit -m "feat(api): 新增 AI 文案生成 API"
```

---

### Task 4.2: 建立前端 AI Copywriting Hook 並整合頁面

**Files:**
- Create: `hooks/use-ai-copywriting.ts`
- Modify: `app/(dashboard)/ai-studio/page.tsx`

**Step 1: 建立 use-ai-copywriting.ts**

```typescript
// hooks/use-ai-copywriting.ts
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface CopywritingResult {
  headlines: string[];
  descriptions: string[];
}

export function useAICopywriting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<CopywritingResult | null>(null);

  const generate = async (productDescription: string, style = 'professional') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/ai/copywriting', {
        product_description: productDescription,
        style,
      });
      setResult(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('生成失敗');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generate,
    result,
    isLoading,
    error,
    reset: () => {
      setResult(null);
      setError(null);
    },
  };
}
```

**Step 2: 更新 ai-studio/page.tsx 使用真實 API**

在 `ai-studio/page.tsx` 中：

```typescript
import { useAICopywriting } from '@/hooks/use-ai-copywriting';

// 在組件中
const { generate, result, isLoading, error } = useAICopywriting();

const handleGenerate = async () => {
  if (!productDescription.trim()) return;
  await generate(productDescription);
};

// 使用 result 替代 generatedCopy
```

**Step 3: Commit**

```bash
git add hooks/use-ai-copywriting.ts app/\(dashboard\)/ai-studio/page.tsx
git commit -m "feat(ai): 整合 AI 文案生成 API 到前端"
```

---

## 最終驗證

### Task: 驗證所有功能

**Step 1: 啟動後端服務**

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Step 2: 啟動前端服務**

```bash
cd ..
pnpm dev
```

**Step 3: 驗證項目**

- [ ] 首頁顯示簡化儀表板（3 個核心指標）
- [ ] 自動駕駛狀態卡片正常顯示
- [ ] AI 執行記錄列表正常顯示
- [ ] 自動駕駛設定頁面可正常儲存
- [ ] AI 創作頁面可生成文案
- [ ] 報告列表頁面正常顯示
- [ ] 側邊欄導航正確

**Step 4: 最終 Commit**

```bash
git add -A
git commit -m "feat: 完成 SDD v2.0 遷移"
```

---

**文件結束**

*總計 4 個 Phase，約 20 個 Task*
