# MSW Mock 数据配置

本目录包含所有前端 API 的 Mock 数据配置，使用 [MSW (Mock Service Worker)](https://mswjs.io/) 拦截和模拟 API 请求。

## 📁 目录结构

```
mock/
├── data/              # Mock 数据
│   ├── organizations.ts
│   ├── assets.ts
│   ├── domains.ts
│   ├── endpoints.ts
│   └── tools.ts
├── handlers/          # MSW 请求处理器
│   ├── organizations.ts
│   ├── assets.ts
│   ├── domains.ts
│   ├── endpoints.ts
│   ├── tools.ts
│   └── index.ts
├── browser.ts         # 浏览器配置
├── index.ts           # 入口文件
└── README.md          # 本文档
```

## 🚀 使用方式

### 启用 Mock (已自动集成)

Mock 已集成到 `app/layout.tsx` 中，在开发环境会自动启用。

### 切换到真实 API

只需删除整个 `mock` 目录即可：

```bash
rm -rf mock/
```

然后从 `app/layout.tsx` 中移除 Mock 相关代码。

## 📝 添加新的 Mock API

### 1. 添加 Mock 数据

在 `data/` 目录下创建或编辑数据文件：

```typescript
// data/example.ts
export const mockExamples = [
  {
    id: 1,
    name: "示例数据",
    // ...
  },
]

let nextExampleId = 2
export const getNextExampleId = () => nextExampleId++
```

### 2. 添加 Handler

在 `handlers/` 目录下创建或编辑 handler 文件：

```typescript
// handlers/example.ts
import { http, HttpResponse } from "msw"
import { mockExamples } from "../data/example"

const BASE_URL = "http://localhost:8888/api"

export const exampleHandlers = [
  // GET /api/examples/
  http.get(`${BASE_URL}/examples/`, () => {
    return HttpResponse.json({
      examples: mockExamples,
      total: mockExamples.length,
    })
  }),

  // POST /api/examples/
  http.post(`${BASE_URL}/examples/`, async ({ request }) => {
    const body = await request.json()
    // 处理逻辑...
    return HttpResponse.json(newExample, { status: 201 })
  }),
]
```

### 3. 注册 Handler

在 `handlers/index.ts` 中导入并导出：

```typescript
import { exampleHandlers } from "./example"

export const handlers = [
  // ...其他 handlers
  ...exampleHandlers,
]
```

## 🔧 当前支持的 API

### 组织 (Organizations)
- ✅ GET `/api/organizations/` - 获取所有组织
- ✅ GET `/api/organizations/:id/` - 获取单个组织
- ✅ POST `/api/organizations/` - 创建组织
- ✅ PATCH `/api/organizations/:id/` - 更新组织
- ✅ DELETE `/api/organizations/:id/` - 删除组织
- ✅ POST `/api/organizations/batch-delete/` - 批量删除
- ✅ GET `/api/organizations/:id/assets/` - 获取组织资产
- ✅ POST `/api/organizations/:id/assets/` - 关联资产
- ✅ POST `/api/organizations/:id/assets/remove/` - 移除资产

### 资产 (Assets)
- ✅ GET `/api/assets/` - 获取所有资产
- ✅ GET `/api/assets/:id/` - 获取单个资产
- ✅ POST `/api/assets/create/` - 批量创建资产
- ✅ PATCH `/api/assets/:id/` - 更新资产
- ✅ DELETE `/api/assets/:id/` - 删除资产
- ✅ POST `/api/assets/batch-delete/` - 批量删除

### 子域名 (Domains)
- ✅ GET `/api/domains/` - 获取所有子域名
- ✅ GET `/api/domains/:id/` - 获取单个子域名
- ✅ POST `/api/domains/create/` - 批量创建子域名
- ✅ PATCH `/api/domains/:id/` - 更新子域名
- ✅ DELETE `/api/domains/:id/` - 删除子域名

### 端点 (Endpoints)
- ✅ GET `/api/endpoints/` - 获取所有端点
- ✅ GET `/api/endpoints/:id/` - 获取单个端点
- ✅ POST `/api/endpoints/create/` - 批量创建端点
- ✅ PATCH `/api/endpoints/:id/` - 更新端点
- ✅ DELETE `/api/endpoints/:id/` - 删除端点

### 工具 (Tools)
- ✅ GET `/api/tools/` - 获取所有工具
- ✅ GET `/api/tools/:id/` - 获取单个工具
- ✅ POST `/api/tools/` - 创建工具
- ✅ PATCH `/api/tools/:id/` - 更新工具
- ✅ DELETE `/api/tools/:id/` - 删除工具

## 💡 提示

### 数据持久化
Mock 数据存储在内存中，刷新页面后会重置。如需持久化，可以考虑使用 `localStorage`。

### 延迟模拟
如需模拟网络延迟，可以在 handler 中添加：

```typescript
http.get(`${BASE_URL}/examples/`, async () => {
  await new Promise(resolve => setTimeout(resolve, 1000)) // 延迟1秒
  return HttpResponse.json(data)
})
```

### 错误模拟
模拟错误响应：

```typescript
http.get(`${BASE_URL}/examples/:id/`, ({ params }) => {
  // 模拟未找到
  if (params.id === '999') {
    return HttpResponse.json(
      { detail: "未找到资源" },
      { status: 404 }
    )
  }
  // 正常响应
  return HttpResponse.json(data)
})
```

## 📚 参考资料

- [MSW 官方文档](https://mswjs.io/)
- [MSW 浏览器集成](https://mswjs.io/docs/integrations/browser)
- [MSW API 参考](https://mswjs.io/docs/api)

## ⚠️ 注意事项

1. **仅用于开发环境** - 生产环境会自动禁用
2. **类型不完全匹配** - 部分 mock 数据使用 `as any` 绕过类型检查
3. **删除即切换** - 删除 mock 目录即可使用真实 API
4. **控制台消息** - MSW 启动时会在控制台显示 `[MSW] Mocking enabled.`

---

**最后更新**: 2025-10-26  
**状态**: ✅ 已完成基础配置
