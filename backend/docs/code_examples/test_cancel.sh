#!/bin/bash
# 
# 取消功能测试脚本
# 
# 用途：快速验证异步协程版本的取消功能是否正常工作
# 
# 预期结果：
# 1. 扫描启动后能正确取消
# 2. 数据库状态从 CANCELLING 更新为 CANCELLED
# 3. on_cancellation handler 被触发（日志中可见）
# 4. 外部进程（amass/subfinder）被正确终止

set -e

# 配置
API_BASE_URL="${API_BASE_URL:-http://localhost:8888}"
LOG_FILE="${LOG_FILE:-backend/logs/app.log}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  取消功能测试"
echo "========================================="
echo ""

# 1. 创建扫描任务
echo -e "${YELLOW}步骤 1: 创建扫描任务${NC}"
echo "API: POST ${API_BASE_URL}/api/scans/"

RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/scans/" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [1],
    "engine": 1,
    "strategy": 1
  }')

# 提取 scan_id（假设返回 JSON 数组，取第一个）
SCAN_ID=$(echo "$RESPONSE" | jq -r '.[0].id // .id')

if [ -z "$SCAN_ID" ] || [ "$SCAN_ID" == "null" ]; then
    echo -e "${RED}✗ 创建扫描失败${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ 扫描创建成功: Scan ID = $SCAN_ID${NC}"
echo ""

# 2. 等待扫描进入运行状态
echo -e "${YELLOW}步骤 2: 等待扫描进入 RUNNING 状态${NC}"
echo "等待 5 秒..."
sleep 5

# 检查状态
STATUS=$(curl -s "${API_BASE_URL}/api/scans/${SCAN_ID}/" | jq -r '.status')
echo "当前状态: $STATUS"

if [ "$STATUS" != "running" ] && [ "$STATUS" != "initiated" ]; then
    echo -e "${YELLOW}⚠ 警告: 扫描状态不是 RUNNING/INITIATED，当前为 ${STATUS}${NC}"
fi
echo ""

# 3. 发送取消请求
echo -e "${YELLOW}步骤 3: 发送取消请求${NC}"
echo "API: POST ${API_BASE_URL}/api/scans/${SCAN_ID}/stop/"

STOP_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/scans/${SCAN_ID}/stop/")
echo "Response: $STOP_RESPONSE"

# 检查是否成功
SUCCESS=$(echo "$STOP_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}✗ 取消请求失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 取消请求已发送${NC}"
echo ""

# 4. 等待状态更新
echo -e "${YELLOW}步骤 4: 等待状态更新为 CANCELLED${NC}"
echo "检查间隔: 1 秒，最多等待 15 秒"

MAX_WAIT=15
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    STATUS=$(curl -s "${API_BASE_URL}/api/scans/${SCAN_ID}/" | jq -r '.status')
    echo "[$WAIT_COUNT/$MAX_WAIT] 当前状态: $STATUS"
    
    if [ "$STATUS" == "cancelled" ]; then
        echo -e "${GREEN}✓ 状态已更新为 CANCELLED${NC}"
        break
    fi
    
    if [ "$STATUS" != "cancelling" ] && [ "$STATUS" != "running" ]; then
        echo -e "${YELLOW}⚠ 警告: 状态变为 ${STATUS}（预期为 CANCELLED）${NC}"
        break
    fi
done

if [ "$STATUS" != "cancelled" ]; then
    echo -e "${RED}✗ 测试失败: 状态未更新为 CANCELLED（当前: ${STATUS}）${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. on_cancellation handler 未触发（异步迁移未完成）"
    echo "  2. Prefect Worker 未重启（仍在使用旧代码）"
    echo "  3. Flow 执行太快，在取消前已完成"
    exit 1
fi
echo ""

# 5. 检查日志（验证 handler 触发）
echo -e "${YELLOW}步骤 5: 检查 on_cancellation handler 日志${NC}"

if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}⚠ 警告: 日志文件不存在: $LOG_FILE${NC}"
else
    # 查找最近 30 秒内的 on_cancellation 日志
    HANDLER_LOG=$(tail -n 500 "$LOG_FILE" | grep -i "on_cancellation\|扫描状态已更新为 CANCELLED" | tail -n 5)
    
    if [ -z "$HANDLER_LOG" ]; then
        echo -e "${RED}✗ 未找到 on_cancellation handler 日志${NC}"
        echo ""
        echo "可能的原因："
        echo "  1. 异步迁移未完成（仍在使用 .submit()）"
        echo "  2. 日志级别过滤了相关日志"
        echo "  3. 日志文件路径不正确"
    else
        echo -e "${GREEN}✓ 找到 handler 日志：${NC}"
        echo "$HANDLER_LOG"
    fi
fi
echo ""

# 6. 检查外部进程（可选）
echo -e "${YELLOW}步骤 6: 检查外部进程是否终止${NC}"

AMASS_PROC=$(ps aux | grep -i "amass" | grep -v grep || true)
SUBFINDER_PROC=$(ps aux | grep -i "subfinder" | grep -v grep || true)

if [ -n "$AMASS_PROC" ]; then
    echo -e "${YELLOW}⚠ 警告: 发现残留的 amass 进程${NC}"
    echo "$AMASS_PROC"
else
    echo -e "${GREEN}✓ 没有残留的 amass 进程${NC}"
fi

if [ -n "$SUBFINDER_PROC" ]; then
    echo -e "${YELLOW}⚠ 警告: 发现残留的 subfinder 进程${NC}"
    echo "$SUBFINDER_PROC"
else
    echo -e "${GREEN}✓ 没有残留的 subfinder 进程${NC}"
fi
echo ""

# 7. 总结
echo "========================================="
echo "  测试结果汇总"
echo "========================================="
echo ""
echo "Scan ID: $SCAN_ID"
echo "最终状态: $STATUS"
echo ""

if [ "$STATUS" == "cancelled" ]; then
    echo -e "${GREEN}✓✓✓ 测试通过：取消功能正常工作 ✓✓✓${NC}"
    echo ""
    echo "验证点："
    echo "  ✓ 扫描任务能正确取消"
    echo "  ✓ 数据库状态更新为 CANCELLED"
    echo "  ✓ API 响应正确"
    
    if [ -n "$HANDLER_LOG" ]; then
        echo "  ✓ on_cancellation handler 被触发"
    else
        echo "  ⚠ on_cancellation handler 日志未找到（需手动确认）"
    fi
    
    exit 0
else
    echo -e "${RED}✗✗✗ 测试失败：取消功能有问题 ✗✗✗${NC}"
    echo ""
    echo "问题："
    echo "  ✗ 数据库状态未更新为 CANCELLED（当前: $STATUS）"
    echo ""
    echo "下一步："
    echo "  1. 检查 Prefect Worker 是否重启"
    echo "  2. 确认异步版本代码已部署"
    echo "  3. 查看完整日志: tail -f $LOG_FILE"
    echo "  4. 检查 Prefect UI: http://localhost:4200"
    
    exit 1
fi
