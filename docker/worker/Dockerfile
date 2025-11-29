# 第一阶段：使用 Go 官方镜像编译工具
FROM golang:1.24 AS go-builder

ENV GOPROXY=https://goproxy.cn,direct
# Naabu 需要 CGO 和 libpcap
ENV CGO_ENABLED=1

# 安装编译依赖
RUN apt-get update && apt-get install -y libpcap-dev

# 安装 ProjectDiscovery 工具
RUN go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest && \
    go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest && \
    go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest && \
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    go install -v github.com/projectdiscovery/katana/cmd/katana@latest

# 第二阶段：运行时镜像
FROM ubuntu:24.04

# 避免交互式提示
ENV DEBIAN_FRONTEND=noninteractive

# 设置工作目录
WORKDIR /app

# 1. 安装基础工具和 Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    pipx \
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

# 2. 使用 pipx 安装 Python 扫描工具
ENV PATH="/root/.local/bin:$PATH"
RUN pipx install uro && \
    pipx install git+https://github.com/xnl-h4ck3r/waymore.git

# 3. 安装 Sublist3r
RUN git clone https://github.com/aboul3la/Sublist3r.git /opt/github/Sublist3r && \
    pip3 install --no-cache-dir -r /opt/github/Sublist3r/requirements.txt --break-system-packages

# 4. 从 go-builder 阶段复制 Go 环境和编译好的工具
COPY --from=go-builder /usr/local/go /usr/local/go
COPY --from=go-builder /go/bin/* /usr/local/bin/

ENV GOPATH=/root/go
ENV PATH=/usr/local/go/bin:$PATH:$GOPATH/bin
ENV GOPROXY=https://goproxy.cn,direct

# 5. 安装 Python 依赖
COPY backend/requirements.txt .

# 直接安装依赖 (Ubuntu 24.04 自带 pip 24.0+，支持 --break-system-packages)
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# 6. 复制后端代码
COPY backend /app/backend
ENV PYTHONPATH=/app/backend

# 设置 Prefect API URL (将在 docker-compose 中覆盖)
ENV PREFECT_API_URL="http://server:4200/api"

# 7. 启动 Worker
COPY docker/worker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
