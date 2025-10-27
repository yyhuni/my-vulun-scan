# Mock 系统集成文档

本项目已集成 Mock Service Worker (MSW)，所有 Mock 文件在 `frontend/mock/` 目录下。

## 📦 文件结构

```
frontend/
├── mock/                          # 👈 所有 Mock 文件
│   ├── fixtures/                  # Mock 数据
│   │   ├── organizations.ts
│   │   ├── assets.ts
│   │   ├── domains.ts
│   │   └── endpoints.ts
│   ├── handlers/                  # API 拦截器
│   │   ├── organizations.ts
│   │   ├── assets.ts
│   │   └── index.ts
│   ├── browser.ts                 # 浏览器端初始化
│   └── index.ts                   # 统一导出
├── components/providers/
│   └── mock-provider.tsx          # Mock Provider 组件
├── scripts/
│   └── toggle-mock.js             # Mock 开关脚本
├── app/layout.tsx                 # ✅ 已集成 MockProvider
├── tsconfig.json                  # ✅ 已配置 @mock/* 路径别名
└── package.json                   # ✅ 已添加 mock:* 脚本
```

## 🚀 如何启动

### 方法 1：命令行（推荐）

```bash
cd frontend
npm run mock:enable    # 启用 Mock
npm run dev           # 启动开发服务器
```

### 方法 2：手动

创建 `frontend/.env.local`：
```bash
NEXT_PUBLIC_ENABLE_MOCK=true
```

然后启动：
```bash
npm run dev
```

### 验证

浏览器控制台应显示：
```
🎭 Mock Service Worker 已启动
[MSW] Mocking enabled.
```

## 🔧 如何集成（已完成）

项目已集成，但如果需要了解集成步骤：

1. **添加 MockProvider 到 layout.tsx**：
```tsx
import { MockProvider } from "@/components/providers/mock-provider"

export default function RootLayout({ children }) {
  return (
    <MockProvider>
      {children}
    </MockProvider>
  )
}
```

2. **配置 tsconfig.json**：
```json
{
  "compilerOptions": {
    "paths": {
      "@mock/*": ["./mock/*"]
    }
  }
}
```

3. **添加脚本到 package.json**：
```json
{
  "scripts": {
    "mock:enable": "node scripts/toggle-mock.js enable",
    "mock:disable": "node scripts/toggle-mock.js disable",
    "mock:status": "node scripts/toggle-mock.js status"
  }
}
```

## 🗑️ 如何删除

如不需要 Mock，执行以下步骤：

```bash
# 1. 删除 mock 目录
rm -rf frontend/mock

# 2. 删除 Provider
rm frontend/components/providers/mock-provider.tsx

# 3. 删除脚本目录（如果 scripts/ 下只有这一个文件）
rm -rf frontend/scripts
# 或者只删除脚本文件（如果 scripts/ 下还有其他文件）
# rm frontend/scripts/toggle-mock.js

# 4. 删除环境变量（如有）
rm frontend/.env.local
```

然后在 `frontend/app/layout.tsx` 中移除：
```tsx
// 删除这一行
import { MockProvider } from "@/components/providers/mock-provider"

// 移除 <MockProvider> 包装
```

在 `frontend/package.json` 中删除（可选）：
```json
"mock:enable": "node scripts/toggle-mock.js enable",
"mock:disable": "node scripts/toggle-mock.js disable",
"mock:status": "node scripts/toggle-mock.js status"
```

## 📝 添加新的 Mock API

1. 创建 handler：`mock/handlers/newFeature.ts`
```typescript
import { http, HttpResponse } from 'msw'

export const newFeatureHandlers = [
  http.get('/api/new-feature/', () => {
    return HttpResponse.json({ data: 'your data' })
  })
]
```

2. 在 `mock/handlers/index.ts` 中注册：
```typescript
import { newFeatureHandlers } from './newFeature'

export const handlers = [
  ...organizationHandlers,
  ...assetHandlers,
  ...newFeatureHandlers,
]
```

## ✅ 已支持的 API

### 组织 API（12 个）
- GET/POST/PUT/DELETE `/api/organizations/`
- POST `/api/organizations/batch_delete/`
- GET/POST `/api/organizations/:id/assets/`
- POST `/api/organizations/:id/assets/unlink/`
- GET/POST `/api/organizations/:id/domains/`
- POST `/api/organizations/:id/domains/remove/`

### 资产 API（8 个）
- GET/PATCH/DELETE `/api/assets/`
- POST `/api/assets/create/`
- POST `/api/assets/batch-delete/`
- GET `/api/assets/:id/domains/`
- GET `/api/assets/:id/endpoints/`

### 目标 API（9 个）
- GET/POST/PATCH/DELETE `/api/targets/`
- POST `/api/targets/batch-delete/`
- GET/POST `/api/targets/:id/organizations/`
- POST `/api/targets/:id/organizations/unlink/`

## 🔧 常用命令

```bash
npm run mock:enable     # 启用 Mock
npm run mock:disable    # 禁用 Mock
npm run mock:status     # 查看状态
npm run dev            # 启动开发服务器
```

## 💡 重要提示

- ✅ Mock 仅在开发环境生效（通过环境变量控制）
- ✅ 未定义的 API 会自动请求真实后端
- ✅ Mock 数据在 `mock/fixtures/` 中
- ✅ 所有 Mock 代码独立，删除不影响业务代码
- ✅ 支持模拟延迟、错误等场景（使用 `delay` 和自定义状态码）
- ⚠️ Mock 内部使用相对路径导入，避免 Turbopack 运行时别名解析问题

---

**对 AI 的提示**：
- 启动：`npm run mock:enable && npm run dev`
- 删除：删除 `frontend/mock/`、`frontend/scripts/`、`mock-provider.tsx`、在 `layout.tsx` 移除引用即可
- 添加新 API：在 `mock/handlers/` 创建 handler 并注册到 `index.ts`
