# AdOptimize - Agent Build Instructions

## Project Overview

AdOptimize 是一個跨平台廣告優化工具，採用**混合架構**：
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python (Google/Meta API Integration)
- **Database**: PostgreSQL + Redis

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- pnpm (recommended)

### 1. Start Infrastructure
```bash
# Start PostgreSQL and Redis
docker-compose -f docker/docker-compose.yml up -d
```

### 2. Frontend Setup
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Visit http://localhost:3000
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info
```

---

## Development Commands

### Frontend (Next.js)
```bash
pnpm dev              # Start development server (port 3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm test             # Run Vitest tests
pnpm test:coverage    # Coverage report
```

### Backend (Python)
```bash
cd backend

# Development
uvicorn app.main:app --reload --port 8000

# Testing
pytest                            # Run all tests
pytest --cov=app tests/           # Coverage report
pytest tests/test_specific.py     # Run specific test

# Database
alembic upgrade head              # Run migrations
alembic revision --autogenerate -m "description"  # Create migration

# Celery
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info  # Scheduler
```

### Docker
```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Stop all services
docker-compose -f docker/docker-compose.yml down

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

---

## Environment Variables

### Frontend (.env.local)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-char-secret-here

NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://adoptimize:password@localhost:5432/adoptimize

# Redis
REDIS_URL=redis://localhost:6379

# Google Ads API
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_REFRESH_TOKEN=your-refresh-token

# Meta Marketing API
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_ACCESS_TOKEN=your-access-token
```

---

## Project Structure

```
adoptimize/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/v1/            # BFF API Routes
├── components/            # React components
│   ├── ui/               # shadcn/ui
│   ├── dashboard/        # Dashboard components
│   └── shared/           # Shared components
├── lib/                   # Utilities
├── backend/              # Python services
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── models/       # SQLAlchemy models
│   │   └── workers/      # Celery tasks
│   └── tests/
├── docker/               # Docker configs
├── specs/                # Specifications
├── @fix_plan.md          # Task tracking
├── @AGENT.md             # This file
└── PROMPT.md             # Development instructions
```

---

## Testing Strategy

### Frontend Testing
- **Framework**: Vitest + React Testing Library
- **Coverage Target**: 80%
- **Focus**: Components, hooks, API handlers

### Backend Testing
- **Framework**: Pytest + pytest-asyncio
- **Coverage Target**: 85%
- **Focus**: Services, API endpoints, workers

---

## Quality Standards

### Before Marking Feature Complete
- [ ] All tests passing
- [ ] Coverage meets threshold (80% frontend, 85% backend)
- [ ] No TypeScript/linting errors
- [ ] Changes committed with conventional commits
- [ ] @fix_plan.md updated

### Conventional Commit Format
```
feat(dashboard): add metric cards with status indicators
fix(auth): resolve token refresh race condition
test(health): add audit score calculation tests
docs(api): update endpoint documentation
```

---

## API Communication Pattern

### BFF (Backend for Frontend)
```
Browser → Next.js API Route → FastAPI Backend → Google/Meta APIs
```

### Example BFF Route
```typescript
// app/api/v1/dashboard/overview/route.ts
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${process.env.PYTHON_API_URL}/api/v1/dashboard/overview`, {
    headers: { 'Authorization': `Bearer ${session.accessToken}` }
  });

  return Response.json(await res.json());
}
```

---

## Key Learnings

### Architecture Decisions
1. **Hybrid Architecture**: Best of both worlds - Next.js for UI, Python for API SDK compatibility
2. **BFF Pattern**: Next.js API routes proxy to Python, simplifying auth and CORS
3. **Celery for Background Jobs**: Google/Meta API rate limits require careful scheduling

### Performance Considerations
1. Use Redis for caching frequently accessed metrics
2. Implement incremental sync (only fetch changed data)
3. Use database connection pooling

### Security Notes
1. Never expose Google/Meta API credentials to frontend
2. All sensitive data flows through BFF
3. Implement proper token refresh before expiry

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Database connection failed**
```bash
# Check if PostgreSQL is running
docker-compose -f docker/docker-compose.yml ps

# Restart services
docker-compose -f docker/docker-compose.yml restart
```

**Redis connection failed**
```bash
# Check Redis status
docker-compose -f docker/docker-compose.yml logs redis
```

---

## Reference Links

- [Next.js 14 Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)

