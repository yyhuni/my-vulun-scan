# Loading 状态统一管理实现指南

## 📋 概述

本文档描述了项目中 Loading 状态统一管理的实现方案，解决了 CODE_REVIEW.md 中第 18 项问题："前端缺少 Loading 状态统一管理"。

## 🎯 解决的问题

### 原有问题
- 每个组件单独管理 Loading 状态（如 `viewState`, `isSubmitting`）
- Loading 组件样式不统一
- 没有充分利用已安装的 React Query
- 错误处理分散，用户体验不一致

### 新方案优势
- ✅ 统一的 Loading 组件和状态管理
- ✅ 基于 React Query 的自动缓存和状态管理
- ✅ 乐观更新提升用户体验
- ✅ 自动错误处理和重试机制
- ✅ 更好的开发者体验

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     应用层 (App Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  React Components                                           │
│  ├── OrganizationListWithQuery                            │
│  ├── AddOrganizationDialogWithQuery                       │
│  └── ...                                                   │
├─────────────────────────────────────────────────────────────┤
│                   Hooks 层 (Hooks Layer)                   │
│  ├── useOrganizations                                      │
│  ├── useCreateOrganization                                 │
│  ├── useDeleteOrganization                                 │
│  └── useBatchDeleteOrganizations                           │
├─────────────────────────────────────────────────────────────┤
│                 React Query 层 (Query Layer)               │
│  ├── QueryClient (缓存管理)                                │
│  ├── Query Keys (查询键管理)                               │
│  └── Mutations (数据变更)                                  │
├─────────────────────────────────────────────────────────────┤
│                   UI 组件层 (UI Layer)                     │
│  ├── LoadingSpinner                                        │
│  ├── LoadingState                                          │
│  └── LoadingOverlay                                        │
├─────────────────────────────────────────────────────────────┤
│                 服务层 (Service Layer)                     │
│  └── OrganizationService                                   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 文件结构

```
front/
├── components/
│   ├── ui/
│   │   └── loading-spinner.tsx          # 统一 Loading 组件
│   ├── providers/
│   │   └── query-provider.tsx           # React Query Provider
│   └── assets/organization/
│       ├── organization-list-with-query.tsx      # 新版组织列表
│       └── add-organization-dialog-with-query.tsx # 新版添加对话框
├── hooks/
│   └── use-organizations.ts             # 组织相关 Query Hooks
└── docs/
    └── LOADING_STATE_IMPLEMENTATION.md  # 本文档
```

## 🔧 核心组件

### 1. Loading 组件 (`components/ui/loading-spinner.tsx`)

提供三种统一的 Loading 组件：

```tsx
// 基础加载动画
<LoadingSpinner size="md" />

// 带文字的加载状态
<LoadingState message="加载中..." />

// 加载遮罩
<LoadingOverlay isLoading={true}>
  <YourContent />
</LoadingOverlay>
```

### 2. React Query Provider (`components/providers/query-provider.tsx`)

配置全局 React Query 设置：
- 5分钟数据新鲜度
- 10分钟缓存时间
- 智能重试策略（4xx 错误不重试）
- 开发环境 DevTools

### 3. 查询 Hooks (`hooks/use-organizations.ts`)

提供统一的数据操作接口：

```tsx
// 查询组织列表
const { data, isLoading, error } = useOrganizations({
  page: 1,
  pageSize: 10,
  sortBy: "updatedAt",
  sortOrder: "desc"
})

// 创建组织
const createOrg = useCreateOrganization()
createOrg.mutate({ name: "新组织", description: "描述" })

// 删除组织（乐观更新）
const deleteOrg = useDeleteOrganization()
deleteOrg.mutate(organizationId)
```

## 🚀 使用示例

### 基础查询使用

```tsx
function OrganizationList() {
  const { data, isLoading, error, refetch } = useOrganizations()

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState onRetry={refetch} />
  
  return <DataTable data={data?.organizations} />
}
```

### 变更操作使用

```tsx
function DeleteButton({ orgId }: { orgId: number }) {
  const deleteOrg = useDeleteOrganization()

  return (
    <Button 
      onClick={() => deleteOrg.mutate(orgId)}
      disabled={deleteOrg.isPending}
    >
      {deleteOrg.isPending ? (
        <>
          <LoadingSpinner size="sm" />
          删除中...
        </>
      ) : (
        "删除"
      )}
    </Button>
  )
}
```

## 📊 性能优化

### 1. 查询键管理
```tsx
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (params?: any) => [...organizationKeys.lists(), params] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: number) => [...organizationKeys.details(), id] as const,
}
```

### 2. 乐观更新
- 删除操作：立即从 UI 移除，失败时回滚
- 创建操作：等待响应后更新（避免临时 ID 问题）
- 编辑操作：等待响应后更新

### 3. 缓存策略
- 列表查询：5分钟新鲜度，支持后台更新
- 详情查询：按需获取，自动缓存
- 变更后自动失效相关缓存

## 🔄 迁移指南

### 从旧组件迁移到新组件

1. **替换组件导入**：
```tsx
// 旧版
import { OrganizationList } from './organization-list'

// 新版
import { OrganizationListWithQuery } from './organization-list-with-query'
```

2. **移除手动状态管理**：
```tsx
// 删除这些状态
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState([])

// 替换为 React Query Hook
const { data, isLoading, error } = useOrganizations()
```

3. **更新错误处理**：
```tsx
// 旧版：手动 try-catch
try {
  const response = await api.get('/organizations')
  setData(response.data)
} catch (error) {
  setError(error.message)
  toast.error(error.message)
}

// 新版：自动处理
const { data, isLoading, error } = useOrganizations()
// 错误会自动显示 toast，无需手动处理
```

## 🎨 用户体验改进

### 1. 加载状态
- **统一样式**：所有 Loading 使用相同的动画和样式
- **语义化**：支持屏幕阅读器的 `aria-label`
- **尺寸适配**：sm/md/lg 三种尺寸适应不同场景

### 2. 乐观更新
- **删除操作**：立即从列表移除，提升响应速度
- **失败回滚**：API 失败时自动恢复原状态
- **加载提示**：显示操作进度和状态

### 3. 错误处理
- **自动重试**：网络错误自动重试，指数退避
- **友好提示**：统一的错误消息格式
- **手动重试**：提供重试按钮

## 🛠️ 开发工具

### React Query DevTools
开发环境自动启用，提供：
- 查询状态可视化
- 缓存数据查看
- 网络请求监控
- 性能分析

### 调试技巧
```tsx
// 查看查询状态
const query = useOrganizations()
console.log({
  isLoading: query.isLoading,
  isFetching: query.isFetching,
  isError: query.isError,
  data: query.data
})

// 手动触发重新获取
query.refetch()

// 手动更新缓存
const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
```

## 📈 监控和分析

### 性能指标
- **缓存命中率**：通过 DevTools 查看
- **请求频率**：避免重复请求
- **加载时间**：监控 API 响应时间

### 用户体验指标
- **首屏加载时间**：使用 Suspense 和 Loading 状态
- **操作响应时间**：乐观更新提升感知性能
- **错误恢复时间**：自动重试减少用户干预

## 🔮 未来扩展

### 1. 其他模块迁移
按相同模式为其他模块（Domain、SubDomain 等）创建 Query Hooks：
```tsx
// hooks/use-domains.ts
// hooks/use-subdomains.ts
// hooks/use-endpoints.ts
```

### 2. 离线支持
集成 React Query 的离线功能：
```tsx
// 配置离线查询
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
    },
  },
})
```

### 3. 实时更新
集成 WebSocket 或 Server-Sent Events：
```tsx
// 实时数据同步
useEffect(() => {
  const ws = new WebSocket('/ws/organizations')
  ws.onmessage = (event) => {
    queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
  }
}, [])
```

## 📚 相关文档

- [React Query 官方文档](https://tanstack.com/query/latest)
- [项目 API 客户端文档](../lib/api-client.ts)
- [组织服务文档](../services/organization.service.ts)
- [Loading 状态设计指南](./LOADING_SETUP.md)

---

**实现状态**: ✅ 已完成  
**最后更新**: 2025-10-06  
**负责人**: AI Assistant
