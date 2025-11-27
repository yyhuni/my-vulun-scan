#!/bin/bash
cd "$(dirname "$0")"

# 检查 .env
if [ ! -f .env ]; then
    echo "⚠️ .env not found, copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env with default values. Please edit it for production."
fi

echo "🚀 Starting services..."
docker-compose up -d --build
echo "✅ Services started!"
echo "  - Prefect UI: http://localhost:4200"
echo "  - Django API: http://localhost:8888"
