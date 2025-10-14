# 安全扫描工具执行器 - 基于 Kali Linux 的完整环境
# 强制使用 amd64 平台（在 ARM Mac 上会通过 Rosetta 2 模拟运行）
FROM --platform=linux/amd64 kalilinux/kali-rolling

LABEL maintainer="vulun-scan"
LABEL description="Complete environment for security scanning tools based on Kali Linux"

# 避免交互式提示
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=Asia/Shanghai

# 设置工作目录
WORKDIR /workspace

# ============================================
# APT 配置优化（提高稳定性和速度）
# ============================================
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::http::Timeout "30";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'Acquire::ftp::Timeout "30";' >> /etc/apt/apt.conf.d/80-retries \
    && echo 'APT::Get::Assume-Yes "true";' >> /etc/apt/apt.conf.d/90-assumeyes \
    && echo 'APT::Install-Recommends "false";' >> /etc/apt/apt.conf.d/90-norecommends

# ============================================
# 第一阶段：安装基础系统工具和依赖
# ============================================
# 添加重试机制和更好的错误处理
RUN for i in 1 2 3; do \
        apt-get update && break || \
        if [ $i -lt 3 ]; then \
            echo "apt-get update 失败，等待 10 秒后重试 ($i/3)..."; \
            sleep 10; \
        else \
            echo "apt-get update 失败 3 次，构建终止"; \
            exit 1; \
        fi; \
    done \
    && apt-get install -y \
    # 基础工具
    curl \
    wget \
    git \
    unzip \
    zip \
    tar \
    gzip \
    ca-certificates \
    software-properties-common \
    apt-transport-https \
    gnupg \
    lsb-release \
    # 编译工具
    build-essential \
    gcc \
    g++ \
    make \
    cmake \
    autoconf \
    automake \
    libtool \
    pkg-config \
    # 网络工具
    net-tools \
    netcat-traditional \
    nmap \
    dnsutils \
    iputils-ping \
    traceroute \
    whois \
    iproute2 \
    # 文本处理工具
    jq \
    xmlstarlet \
    # 其他实用工具
    vim \
    nano \
    htop \
    tree \
    screen \
    tmux \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 第二阶段：安装 Python 环境
# ============================================
RUN for i in 1 2 3; do apt-get update && break || sleep 10; done \
    && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    python3-setuptools \
    python3-wheel \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && pip install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 安装常用 Python 包
RUN pip install --no-cache-dir --break-system-packages \
    requests \
    beautifulsoup4 \
    lxml \
    pyyaml \
    colorama \
    tqdm

# ============================================
# 第三阶段：安装 Go 环境
# ============================================
ENV GO_VERSION=1.21.5
ENV GOPATH=/root/go
ENV PATH=$PATH:/usr/local/go/bin:$GOPATH/bin

# 添加重试机制下载 Go（使用 amd64 架构）
RUN for i in 1 2 3; do \
        wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && break || \
        if [ $i -lt 3 ]; then \
            echo "下载 Go 失败，等待 10 秒后重试 ($i/3)..."; \
            sleep 10; \
        fi; \
    done \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz \
    && mkdir -p $GOPATH/bin

# ============================================
# 第四阶段：安装 Node.js 和 npm
# ============================================
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 第五阶段：安装 Ruby 环境
# ============================================
RUN for i in 1 2 3; do apt-get update && break || sleep 10; done \
    && apt-get install -y \
    ruby \
    ruby-dev \
    rubygems \
    && gem install bundler \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 第六阶段：安装 Rust 环境（某些工具需要）
# ============================================
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . $HOME/.cargo/env

ENV PATH=$PATH:/root/.cargo/bin

# ============================================
# 第七阶段：安装 Java 环境（某些工具需要）
# ============================================

RUN for i in 1 2 3; do apt-get update && break || sleep 10; done \
    && apt-get install -y \
    default-jdk \
    default-jre \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 自动设置 JAVA_HOME（default-jdk 会创建符号链接）
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH=$PATH:$JAVA_HOME/bin

# ============================================
# 第八阶段：安装 Docker CLI（用于某些容器化工具）
# ============================================
# 使用 Debian 源（Kali 基于 Debian），而不是 Ubuntu 源
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian bookworm stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && for i in 1 2 3; do apt-get update && break || sleep 10; done \
    && apt-get install -y docker-ce-cli || echo "Docker CLI 安装失败，跳过（非关键组件）" \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 第九阶段：安装常用安全工具依赖库
# ============================================
RUN for i in 1 2 3; do apt-get update && break || sleep 10; done \
    && apt-get install -y \
    # SSL/TLS 库
    libssl-dev \
    # 压缩库
    zlib1g-dev \
    libbz2-dev \
    # XML 库
    libxml2-dev \
    libxslt1-dev \
    # 图像处理库
    libpng-dev \
    libjpeg-dev \
    # 数据库客户端
    libpq-dev \
    default-libmysqlclient-dev \
    libsqlite3-dev \
    # 其他常用库
    libffi-dev \
    libgdbm-dev \
    libncurses-dev \
    libreadline-dev \
    libyaml-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# 第十阶段：创建必要的目录结构
# ============================================
RUN mkdir -p /tools \
    && mkdir -p /workspace/output \
    && mkdir -p /workspace/config \
    && mkdir -p /workspace/wordlists \
    && mkdir -p /workspace/scripts

# ============================================
# 环境验证和信息输出
# ============================================
RUN echo "========================================" \
    && echo "环境信息:" \
    && echo "========================================" \
    && echo "Python: $(python --version 2>&1)" \
    && echo "Go: $(go version)" \
    && echo "Node.js: $(node --version)" \
    && echo "npm: $(npm --version)" \
    && echo "Ruby: $(ruby --version)" \
    && echo "Rust: $(rustc --version)" \
    && echo "Java: $(java -version 2>&1 | head -n 1)" \
    && echo "Docker CLI: $(docker --version 2>/dev/null || echo 'Not installed')" \
    && echo "========================================"

# 设置默认命令
CMD ["/bin/bash"]

# 健康检查（验证关键工具是否存在）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD which go && which python && which node
