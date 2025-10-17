# 前端代码审查报告（front/）

时间：2025-10-17
目录：`front/`

## 概览
- **技术栈**：Next.js App Router、React Query、@tanstack/react-table、shadcn/ui、TailwindCSS
- **结构清晰**：接口在 `front/services/`，类型在 `front/types/`，通用客户端在 `front/lib/api-client.ts`
- **命名转换**：请求体与查询参数通过 `snakecase-keys`，响应通过 `camelcase-keys` 自动转换，避免前端手写下划线字段
- **数据获取**：通过 hooks 封装 React Query，mutations 统一做 toast、缓存失效，实践规范良好

## 主要符合项（正向结论）
- **[命名转换规范]** `front/lib/api-client.ts` 拦截器实现：
  - 只转换 `config.data` 与 `config.params` 的键名为下划线；不转换手动拼接的 URL 查询字符串（已符合规范，避免手写）
  - 响应体统一深度转换为驼峰，前端使用驼峰字段（如：`updatedAt`、`statusCode`）更自然
- **[日志控制]** API 客户端日志仅在开发环境输出（`process.env.NODE_ENV === 'development'`），避免生产泄露
- **[分层一致]** 服务在 `front/services/`，类型在 `front/types/`，与规范一致
- **[React Query 使用]** hooks 层做业务 toast 与缓存失效（规则 17），页面使用 `router.push`（规则 23）而非 `window.location`
- **[参数传递]** 项目各服务均使用 `params` 对象传参，未发现手写 query string（符合规则 15）

## 发现问题与建议

- **[高] Hooks 使用位置不规范（可能导致 Invalid hook call）**
  - 文件：`front/components/assets/domain/endpoints/endpoints-columns.tsx`
  - 问题：在列定义的 `cell` 渲染回调中直接使用 `React.useState`（URL 列、Endpoint 列复制按钮），Hook 并不处于函数组件或自定义 Hook 顶层。
  - 影响：在严格模式或未来版本可能引发 Hook 调用错误或行为不稳定。
  - 建议：将 `cell` 中的逻辑提取为子组件，在子组件中使用 Hook。例如：
    - `cell: ({ row }) => <UrlCell url={row.getValue('url')} />`
    - `cell: ({ row }) => <EndpointCell value={row.getValue('endpoint')} />`

- **[中] 错误信息直接回传后端 message（用户提示不统一）**
  - 文件：`front/hooks/use-endpoints.ts`、`front/hooks/use-subdomains.ts`
  - 表现：`select` 中通过 `throw new Error(response.message || '...')`，而页面层（如 `front/components/assets/domain/endpoints/endpoints-list.tsx`）会直接展示 `error.message`。
  - 与规则：不符合“前端 toast/提示自定义文案，而不是直接使用后端 message”（规则 24）。
  - 建议：
    - `select` 抛出固定错误码或布尔标记（如：`throw new Error('FETCH_ENDPOINTS_FAILED')`）
    - 页面层对错误码做映射到固定中文文案；后端响应体可在控制台打印，避免面向用户直接显示后端消息。

- **[低] 列显示映射与实际列不一致**
  - 文件：`front/components/assets/domain/endpoints/endpoints-data-table.tsx`
  - 现状：列名映射包含 `createdAt`，但 `endpoints-columns.tsx` 未定义 `createdAt` 列（仅有 `updatedAt`）。
  - 建议：增加 `createdAt` 列或移除该映射，避免列控制菜单产生困惑。

- **[低] 无用导入**
  - 文件：`front/components/assets/domain/endpoints/endpoints-columns.tsx`
  - 现状：`Network`、`Globe`、`Code` 等图标未使用。
  - 建议：清理未使用导入，保持构建输出干净。

- **[建议] hooks 中的控制台日志按环境收敛**
  - 文件：多个 hooks（如 `front/hooks/use-endpoints.ts`、`front/hooks/use-domains.ts`、`front/hooks/use-subdomains.ts`）
  - 现状：存在直接 `console.log('后端响应:', response)` 的打印。虽然客户端已限制，但 hooks 的日志在生产会产生噪音。
  - 建议：用 `if (process.env.NODE_ENV === 'development')` 包裹，或集中到开发调试开关。

- **[观察] 类型与后端返回保持同步**
  - 文件：`front/types/endpoint.types.ts`
  - 说明：当前假定响应字段（含嵌套）已被拦截器转换为驼峰，且 `domain/subdomain` 为字符串。若后端后续改为对象或字段变更（例如增加关联预加载结构），需同步类型与列定义。

## 重点检查摘录
- 命名转换与日志控制：`front/lib/api-client.ts`
- Endpoints 服务：`front/services/endpoint.service.ts`
- Endpoints Hooks：`front/hooks/use-endpoints.ts`
- Endpoints 列定义：`front/components/assets/domain/endpoints/endpoints-columns.tsx`
- Endpoints 表格：`front/components/assets/domain/endpoints/endpoints-data-table.tsx`
- Subdomains 服务与 Hooks：`front/services/subdomain.service.ts`、`front/hooks/use-subdomains.ts`
- Domains 服务与 Hooks：`front/services/domain.service.ts`、`front/hooks/use-domains.ts`

## 结论
- 整体架构与实践与项目规范高度一致：分层清晰、参数与命名转换到位、React Query 使用合理。
- 建议尽快修复列定义中 Hook 使用位置问题（高优先级），并统一错误消息面向用户的呈现策略（中优先级）。
- 其余为低风险代码质量项（列映射一致性、无用导入、生产日志收敛），可在一次代码清理中处理。
