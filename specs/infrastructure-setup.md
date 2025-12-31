# Infrastructure Setup Guide

This guide covers the manual steps needed to complete Phase 1.2 infrastructure setup.

---

## Quick Setup Commands

Run these commands from the project root to set up the infrastructure:

```bash
# 1. Copy Alembic env.py
cp specs/alembic-env-py-final.py backend/alembic/env.py

# 2. Create script.py.mako template
# (Copy content from specs/alembic-script-mako.txt to backend/alembic/script.py.mako)

# 3. Copy Docker Compose
cp specs/docker-compose-template.yml docker/docker-compose.yml

# 4. Copy environment templates
cp .env.local.example .env.local
cp specs/backend-env-example.txt backend/.env

# 5. Copy Vitest config
cp specs/vitest.config.ts vitest.config.ts

# 6. Remove misplaced config (if exists)
rm lib/vitest.config.ts 2>/dev/null || true
```

---

## Step 1: Alembic Migrations

### 1.1 Copy env.py

```bash
cp specs/alembic-env-py-final.py backend/alembic/env.py
```

### 1.2 Create script.py.mako

Create `backend/alembic/script.py.mako` with the following content:

```python
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

### 1.3 Generate Initial Migration

```bash
cd backend
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head
```

---

## Step 2: Docker Compose

### 2.1 Copy Docker Compose

```bash
cp specs/docker-compose-template.yml docker/docker-compose.yml
```

### 2.2 Start Services

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 2.3 Verify Services

```bash
# Check PostgreSQL
docker-compose -f docker/docker-compose.yml exec postgres pg_isready

# Check Redis
docker-compose -f docker/docker-compose.yml exec redis redis-cli ping
```

---

## Step 3: Environment Variables

### 3.1 Frontend (.env.local)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set `NEXTAUTH_SECRET` to a 32-character random string.

### 3.2 Backend (.env)

```bash
cp specs/backend-env-example.txt backend/.env
```

---

## Step 4: Vitest Configuration

### 4.1 Copy Vitest Config

```bash
cp specs/vitest.config.ts vitest.config.ts
```

### 4.2 Run Tests

```bash
pnpm test
```

Expected output: 49 tests passing (25 fatigue-score + 24 health-audit)

---

## Step 5: Python Services

### 5.1 Copy Calculation Services

```bash
# Audit Engine (Health Check scoring)
cp specs/audit_engine.py backend/app/services/audit_engine.py

# Fatigue Score (Creative fatigue calculation)
cp specs/fatigue_score.py backend/app/services/fatigue_score.py
```

### 5.2 Update Services __init__.py

Add to `backend/app/services/__init__.py`:

```python
from app.services.audit_engine import (
    calculate_audit_score,
    AuditInput,
    DimensionInput,
    AuditScoreResult,
    STRUCTURE_ISSUES,
    CREATIVE_ISSUES,
    AUDIENCE_ISSUES,
    BUDGET_ISSUES,
    TRACKING_ISSUES,
)
from app.services.fatigue_score import (
    calculate_fatigue_score,
    FatigueInput,
    FatigueResult,
    FatigueStatus,
)
```

---

## Step 6: Verify Setup

### 6.1 Start All Services

**Terminal 1: Docker (PostgreSQL + Redis)**
```bash
docker-compose -f docker/docker-compose.yml up
```

**Terminal 2: Backend (FastAPI)**
```bash
cd backend
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Terminal 3: Frontend (Next.js)**
```bash
pnpm dev
```

### 6.2 Verify Endpoints

- Frontend: http://localhost:3000
- Backend Health: http://localhost:8000/api/health
- Backend Docs: http://localhost:8000/docs

---

## Troubleshooting

### Database Connection Failed

1. Check if PostgreSQL container is running:
   ```bash
   docker-compose -f docker/docker-compose.yml ps
   ```

2. Verify DATABASE_URL in `backend/.env`:
   ```
   DATABASE_URL=postgresql+asyncpg://adoptimize:password@localhost:5432/adoptimize
   ```

### Redis Connection Failed

1. Check if Redis container is running:
   ```bash
   docker-compose -f docker/docker-compose.yml logs redis
   ```

2. Verify REDIS_URL in `backend/.env`:
   ```
   REDIS_URL=redis://localhost:6379
   ```

### Alembic Migration Failed

1. Ensure database exists:
   ```bash
   docker-compose -f docker/docker-compose.yml exec postgres psql -U adoptimize -c "SELECT 1"
   ```

2. Check if all models are imported in `backend/alembic/env.py`

### Tests Failed

1. Ensure vitest.config.ts exists at project root
2. Check path alias resolution (`@/` should resolve to project root)
3. Run with verbose output: `pnpm test -- --reporter=verbose`

---

## Files Reference

| Template | Destination |
|----------|-------------|
| `specs/alembic-env-py-final.py` | `backend/alembic/env.py` |
| `specs/alembic-script-mako.txt` | `backend/alembic/script.py.mako` |
| `specs/docker-compose-template.yml` | `docker/docker-compose.yml` |
| `specs/backend-env-example.txt` | `backend/.env` |
| `specs/vitest.config.ts` | `vitest.config.ts` |
| `.env.local.example` | `.env.local` |
| `specs/audit_engine.py` | `backend/app/services/audit_engine.py` |
| `specs/fatigue_score.py` | `backend/app/services/fatigue_score.py` |
