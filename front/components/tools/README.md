# 工具管理组件

## 概述
工具管理模块用于展示和管理漏洞扫描工具集。

## 文件结构
```
components/tools/
├── tool-card.tsx        # 工具卡片组件
└── index.ts             # 导出文件

app/tools/
└── page.tsx             # 工具管理页面

types/
└── tool.types.ts        # 工具类型定义
```

## 组件说明

### ToolCard 组件
展示单个工具的信息卡片。

**Props:**
- `tool: Tool` - 工具数据对象
- `onCheckUpdate?: (toolId: number) => void` - 检查更新回调函数

**特性:**
- 显示工具 Logo
- 显示默认工具标签
- GitHub 和 License 链接
- 当前安装版本
- 工具描述（最多 4 行）
- Check Update 按钮

## 使用示例

```tsx
import { ToolCard } from '@/components/tools'

function MyPage() {
  const handleCheckUpdate = (toolId: number) => {
    console.log('Check update for tool:', toolId)
  }

  return (
    <ToolCard 
      tool={myTool}
      onCheckUpdate={handleCheckUpdate}
    />
  )
}
```

## 页面功能

### 工具管理页面 (`/tools`)
- **标签筛选**: All / Default / Custom
- **添加工具**: 点击 "Add new tool" 按钮
- **检查更新**: 每个工具卡片都有 "Check Update" 按钮
- **设置**: 右上角设置按钮

## 后续开发建议

1. **后端集成**
   - 创建 `/api/v1/tools` API 端点
   - 实现工具的 CRUD 操作
   - 添加工具版本检查功能

2. **前端功能**
   - 创建 `hooks/use-tools.ts` hook
   - 创建 `services/tool.service.ts` API 服务
   - 实现添加/编辑工具对话框
   - 实现工具详情页面

3. **UI 增强**
   - 添加工具分类过滤
   - 添加搜索功能
   - 添加排序功能
   - 添加工具状态管理（启用/禁用）

## 数据结构

参考 `types/tool.types.ts` 中的类型定义：
- `Tool` - 工具实体
- `ToolsResponse` - 工具列表响应
- `CreateToolRequest` - 创建工具请求
- `UpdateToolRequest` - 更新工具请求
