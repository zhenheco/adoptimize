#!/bin/bash
# 啟動腳本：先執行資料庫遷移，再啟動 FastAPI

echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
