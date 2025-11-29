FROM python:3.10-slim

WORKDIR /app

# 安装系统依赖 (用于编译某些 Python 包)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend /app/backend
ENV PYTHONPATH=/app/backend

# 暴露端口
# 8888: Django/uvicorn
# 4200: Prefect Server
EXPOSE 8888 4200

# 复制启动脚本
COPY docker/server/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
