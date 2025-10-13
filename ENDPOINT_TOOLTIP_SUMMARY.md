# Endpoint 列添加 Tooltip 和复制功能

## ✅ 已实现的功能

参考子域名页面的设计，为 Endpoint 表格的长列添加了 tooltip 和复制功能。

### 🎯 修改的列

1. **URL 列**
   - ✅ Hover 显示完整 URL 的 tooltip
   - ✅ 复制按钮（hover 时显示）
   - ✅ 等宽字体显示
   - ✅ 长 URL（>60字符）自动换行显示在 tooltip 中

2. **Endpoint 列**
   - ✅ Hover 显示完整路径的 tooltip
   - ✅ 复制按钮（hover 时显示）
   - ✅ 等宽字体显示
   - ✅ 长路径（>30字符）自动换行显示在 tooltip 中

3. **Title 列**
   - ✅ Hover 显示完整标题的 tooltip
   - ✅ 长标题（>30字符）自动换行显示在 tooltip 中
   - ✅ 空值显示 "-"

## 🎨 UI 特性

### Tooltip 显示
```
┌─────────────────────────────────┐
│ https://very-long-url.com/...   │ ← 鼠标悬停
└─────────────────────────────────┘
         ↓ 显示 tooltip
┌───────────────────────────────────────┐
│ https://very-long-url.com/api/v1/... │
│ users/123/profile/settings/security   │
└───────────────────────────────────────┘
```

### 复制按钮
```
行内容:  https://example.com/api  [📋]
         ↑                         ↑
      等宽字体显示            hover时显示的复制按钮
```

点击复制按钮后：
- 按钮图标变为 ✓（绿色）
- 显示 toast 提示"已复制 XXX"
- 2秒后恢复为复制图标

## 📦 技术实现

### 导入的组件
```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
```

### URL 列实现示例
```typescript
cell: ({ row }) => {
  const url = row.getValue("url") as string
  const isLong = url.length > 60
  const [copied, setCopied] = React.useState(false)
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('已复制 URL')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('复制失败')
    }
  }
  
  return (
    <div className="flex items-center gap-2 group">
      {/* Tooltip 显示完整内容 */}
      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-sm font-mono max-w-[400px] truncate cursor-default inline-block">
              {url}
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            align="start"
            sideOffset={5}
            className={`text-xs font-mono ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
          >
            {url}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* 复制按钮（hover时显示） */}
      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 flex-shrink-0 hover:bg-accent transition-opacity ${
                copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{copied ? '已复制' : '复制'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
```

## 🎯 设计特点

### 1. **智能换行**
- 短内容（≤长度阈值）：单行显示，不换行
- 长内容（>长度阈值）：允许换行，设置最大宽度

### 2. **延迟显示**
- `delayDuration={500}` - hover 0.5秒后显示
- `skipDelayDuration={0}` - 快速在同组 tooltip 间切换

### 3. **等宽字体**
- URL 和 Endpoint 使用 `font-mono` 类
- 便于阅读和对齐

### 4. **复制按钮交互**
- 默认隐藏（`opacity-0`）
- hover 行时显示（`group-hover:opacity-100`）
- 复制后图标变化（Copy → Check）
- 复制后保持显示（`opacity-100`）
- 2秒后自动恢复

### 5. **Toast 提示**
- 成功：toast.success('已复制 XXX')
- 失败：toast.error('复制失败')

## 📊 对比

### 之前
```typescript
<div className="max-w-[400px] text-sm">
  <div className="truncate" title={url}>
    {url}
  </div>
</div>
```
- ❌ 原生 title 属性显示效果差
- ❌ 无法复制
- ❌ 长内容无法完整查看

### 现在
```typescript
<div className="flex items-center gap-2 group">
  <TooltipProvider>
    <Tooltip>...</Tooltip>
  </TooltipProvider>
  <Button>复制</Button>
</div>
```
- ✅ 美观的 tooltip 组件
- ✅ 支持一键复制
- ✅ 长内容自动换行
- ✅ hover 时显示操作按钮
- ✅ 复制状态实时反馈

## 🚀 用户体验提升

### 查看完整内容
1. 鼠标悬停在列上
2. 0.5秒后显示 tooltip
3. 查看完整内容

### 复制内容
1. 鼠标悬停在行上
2. 复制按钮显示
3. 点击复制按钮
4. 图标变为 ✓，toast 提示"已复制"
5. 2秒后图标恢复

## 📝 修改的文件

- `front/components/assets/domain/endpoints/endpoints-columns.tsx`
  - 添加 Tooltip、Copy、Check 图标导入
  - 添加 toast 导入
  - 修改 URL 列：添加 tooltip 和复制功能
  - 修改 Endpoint 列：添加 tooltip 和复制功能
  - 修改 Title 列：添加 tooltip

## 🎨 样式一致性

所有长列的 tooltip 设计与子域名页面保持一致：
- ✅ 相同的延迟时间
- ✅ 相同的样式类名
- ✅ 相同的交互逻辑
- ✅ 相同的复制按钮设计

完美匹配整体 UI 风格！🎉
