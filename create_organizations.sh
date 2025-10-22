#!/bin/bash

# 批量创建 200 个组织的脚本
# 使用方式: bash create_organizations.sh

BASE_URL="http://localhost:8888"
API_ENDPOINT="${BASE_URL}/api/organizations/"

echo "开始批量创建 200 个组织..."
echo "API 接口: ${API_ENDPOINT}"
echo "================================"

# 计数器
SUCCESS_COUNT=0
FAILED_COUNT=0

# 循环创建 200 个组织
for i in {1..200}
do
    # 组织名称和描述
    ORG_NAME="组织_${i}"
    ORG_DESCRIPTION="这是第 ${i} 个测试组织"
    
    # 使用 curl 发送 POST 请求
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"${ORG_NAME}\",
            \"description\": \"${ORG_DESCRIPTION}\"
        }")
    
    # 提取 HTTP 状态码（最后一行）
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    # 提取响应体（除最后一行外的所有内容）
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # 判断是否成功（201 Created 或 200 OK）
    if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "✓ [$SUCCESS_COUNT/$((SUCCESS_COUNT + FAILED_COUNT))] 成功创建: ${ORG_NAME} (HTTP ${HTTP_CODE})"
    else
        FAILED_COUNT=$((FAILED_COUNT + 1))
        echo "✗ [$((SUCCESS_COUNT + FAILED_COUNT))] 创建失败: ${ORG_NAME} (HTTP ${HTTP_CODE})"
        echo "   错误信息: ${BODY}"
    fi
    
    # 每 50 个打印一次进度
    if [ $((i % 50)) -eq 0 ]; then
        echo "--------------------------------"
        echo "进度: ${i}/200 (成功: ${SUCCESS_COUNT}, 失败: ${FAILED_COUNT})"
        echo "--------------------------------"
    fi
done

# 输出最终统计
echo ""
echo "================================"
echo "批量创建完成！"
echo "总计: 200"
echo "成功: ${SUCCESS_COUNT}"
echo "失败: ${FAILED_COUNT}"
echo "================================"
