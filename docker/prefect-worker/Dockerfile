# ============================================
# Build Stage: 编译和构建环境
# ============================================
FROM kalilinux/kali-rolling AS builder

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /build

# 1. 安装构建依赖
RUN apt-get update && apt-get install -y \
    golang \
    git \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. 安装 Go 工具 (编译成二进制文件)
# 设置 GOBIN 方便后续复制
ENV GOBIN=/build/bin
RUN mkdir -p $GOBIN

# ProjectDiscovery 全家桶 & 其他 Go 工具
# subfinder: 子域名发现
# naabu: 端口扫描
# httpx: HTTP 服务探测
# katana: 现代爬虫
# ffuf: 模糊测试
# amass: 综合信息收集
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest \
    && go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest \
    && go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest \
    && go install -v github.com/projectdiscovery/katana/cmd/katana@latest \
    && go install -v github.com/ffuf/ffuf/v2@latest \
    && go install -v github.com/owasp-amass/amass/v4/...@latest

# ============================================
# Runtime Stage: 最终运行环境
# ============================================
FROM kalilinux/kali-rolling

LABEL maintainer="xingrin-scanner-worker"

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    TZ=Asia/Shanghai \
    # 确保 Python 输出不缓冲，实时显示在 logs 中
    PYTHONUNBUFFERED=1 \
    # 将 Go 工具路径加入 PATH
    PATH=$PATH:/usr/local/bin/go-tools:/opt/github

WORKDIR /app

# 1. 安装运行时基础依赖
# 注意：nmap 等非 Go/Python 的系统工具需要在这里通过 apt 安装
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    nmap \
    libpcap0.8 \
    ca-certificates \
    curl \
    wget \
    unzip \
    # Chrome 依赖 (Katana 爬虫可能需要 headless 模式)
    chromium \
    # 基础网络工具
    net-tools \
    iputils-ping \
    dnsutils \
    whois \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. 从 Builder 阶段复制 Go 二进制文件
COPY --from=builder /build/bin /usr/local/bin/go-tools

# 3. 准备 Python 环境
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

# 4. 安装 Python 工具 (Waymore, Uro)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir waymore uro

# 5. 安装 GitHub 仓库工具 (Sublist3r, OneForAll)
# 定义工具目录
ENV SCAN_TOOLS_PATH=/opt/github
RUN mkdir -p $SCAN_TOOLS_PATH

# Sublist3r
RUN cd $SCAN_TOOLS_PATH \
    && git clone https://github.com/aboul3la/Sublist3r.git \
    && cd Sublist3r && pip install -r requirements.txt

# OneForAll (依赖较多，单独处理)
RUN cd $SCAN_TOOLS_PATH \
    && git clone https://github.com/shmilylty/OneForAll.git \
    && cd OneForAll && pip install -r requirements.txt

# 6. 复制 requirements.txt 并安装项目依赖
# 注意：实际代码通过 volume 挂载，这里只安装依赖
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 7. 创建工作目录和必要的子目录
RUN mkdir -p /app/backend/logs \
    && mkdir -p /app/backend/scripts/dev/.pids

# 设置工作目录到 backend
# 实际代码通过 -v 挂载到 /app/backend
WORKDIR /app/backend

# 默认命令：启动 Prefect Worker
# 注意：
# - 启动时通过 -v 挂载宿主机代码目录
# - 通过环境变量设置 PREFECT_API_URL 和 pool 名称
CMD ["prefect", "worker", "start", "--pool", "development-pool"]
