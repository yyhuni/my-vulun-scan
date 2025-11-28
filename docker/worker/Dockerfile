FROM ubuntu:22.04

# 避免交互式提示
ENV DEBIAN_FRONTEND=noninteractive

# 设置工作目录
WORKDIR /app

# 1. 安装基础工具和 Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    wget \
    unzip \
    jq \
    tmux \
    nmap \
    masscan \
    libpcap-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 建立 python 软链接
RUN ln -s /usr/bin/python3 /usr/bin/python

# 2. 安装 Go 工具 (扫描器)
ENV GO_VERSION=1.24.0
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz \
    && rm -rf /usr/local/go \
    && tar -C /usr/local -xzf /tmp/go.tar.gz \
    && rm /tmp/go.tar.gz

ENV GOPATH=/root/go
ENV PATH=/usr/local/go/bin:$PATH:$GOPATH/bin

# 安装 ProjectDiscovery 工具集
RUN go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 3. 安装 Python 依赖
COPY backend/requirements.txt .
# 必须使用 --break-system-packages 因为 Ubuntu 22.04+ 的策略
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 4. 复制后端代码
COPY backend /app/backend
ENV PYTHONPATH=/app/backend

# 设置 Prefect API URL (将在 docker-compose 中覆盖)
ENV PREFECT_API_URL="http://server:4200/api"

# 5. 启动 Worker
COPY docker/worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
