#!/bin/bash

# 网络性能监控脚本
# 监控到数据库服务器的网络状况

DB_HOST="119.8.164.25"
DB_PORT="5432"

echo "🌐 网络性能监控开始..."
echo "目标: $DB_HOST:$DB_PORT"
echo "时间: $(date)"
echo "================================"

# 1. 基础网络延迟
echo "📡 ICMP Ping 测试:"
ping -c 5 $DB_HOST | grep "time="

# 2. TCP连接时间
echo -e "\n🔌 TCP连接时间测试:"
for i in {1..5}; do
    echo "测试 $i:"
    time nc -z $DB_HOST $DB_PORT 2>&1
done

# 3. 网络路由跟踪
echo -e "\n🛣️  网络路由:"
traceroute -m 10 $DB_HOST | head -10

# 4. 网络质量测试
echo -e "\n📊 网络质量测试 (10次ping):"
ping -c 10 $DB_HOST | tail -2

# 5. 端口连接测试
echo -e "\n🔍 端口连接测试:"
for i in {1..3}; do
    echo "连接测试 $i:"
    timeout 5 bash -c "time echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>&1
done

echo -e "\n================================"
echo "监控完成: $(date)"
