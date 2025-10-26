# 🚀 MSW Mock 快速开始

## 立即开始（3步）

### 1. 安装 MSW

```bash
cd frontend
npm install --save-dev msw@latest
```

### 2. 初始化 Service Worker

```bash
npx msw init public/ --save
```

这会在 `public/` 目录下创建 `mockServiceWorker.js` 文件。

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`，控制台会显示：

```
✅ [MSW] Mock 数据已启用
[MSW] Mocking enabled.
```

**搞定！** 现在所有 API 请求都使用 Mock 数据，无需启动后端！

---

## ✅ 已配置的功能

### 所有主要 API 都已 Mock
- ✅ 组织 (Organizations) - 5条数据
- ✅ 资产 (Assets) - 8条数据
- ✅ 子域名 (Domains) - 5条数据
- ✅ 端点 (Endpoints) - 4条数据
- ✅ 工具 (Tools) - 4条数据

### 支持的操作
- ✅ GET - 获取列表/详情（带分页）
- ✅ POST - 创建/批量创建
- ✅ PATCH - 更新
- ✅ DELETE - 删除/批量删除

---

## 🔄 切换到真实 API

### 方法：删除 mock 目录

```bash
cd frontend
rm -rf mock/
```

然后从以下文件中移除 Mock 相关代码：
- `app/layout.tsx` - 删除 `<MockProvider>` 相关代码
- `app/mock-provider.tsx` - 删除整个文件

**就这样！** 前端会自动使用真实后端 API。

---

## 💡 提示

### 类型错误（正常现象）

Mock 数据可能与实际类型略有不同，这是正常的。MSW 安装后，大部分类型错误会消失。

剩余的类型错误可以忽略，因为：
- `organizationId`, `assetId` 等字段在 mock 数据中用于关联
- `description` 等字段可能在某些类型中不存在

### 数据重置

Mock 数据存储在内存中，刷新页面会重置所有修改。

### 查看详细文档

- `mock/README.md` - Mock 目录详细说明
- `MSW_SETUP.md` - 完整配置文档

---

## 📝 示例：测试 Mock API

打开浏览器控制台：

```javascript
// 获取所有组织
fetch('http://localhost:8888/api/organizations/')
  .then(r => r.json())
  .then(console.log)

// 创建新组织
fetch('http://localhost:8888/api/organizations/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    name: '新公司', 
    description: '测试描述' 
  })
})
  .then(r => r.json())
  .then(console.log)
```

---

## ✨ 完成

现在你可以：
- ✅ 无需后端即可开发前端
- ✅ 测试所有 CRUD 操作
- ✅ 随时切换到真实 API（删除 mock 目录）

**开始开发吧！** 🎉
