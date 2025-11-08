"use client"

import React, { useState } from "react"
import { LoadingSpinner, LoadingState, LoadingOverlay } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function TestPage() {
  const [showLoadingState, setShowLoadingState] = useState(false)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)

  const handleLoadingStateTest = () => {
    setShowLoadingState(true)
    setTimeout(() => setShowLoadingState(false), 3000)
  }

  const handleOverlayTest = () => {
    setOverlayLoading(true)
    setTimeout(() => setOverlayLoading(false), 3000)
  }

  const handleButtonTest = () => {
    setButtonLoading(true)
    setTimeout(() => setButtonLoading(false), 2000)
  }

  const handleSkeletonTest = () => {
    setShowSkeleton(true)
    setTimeout(() => setShowSkeleton(false), 3000)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">组件测试页面</h1>
        <p className="text-muted-foreground mt-2">测试加载组件和通知组件的各种效果</p>
      </div>

      {/* 1. LoadingSpinner 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>1. LoadingSpinner - 基础旋转加载器</CardTitle>
          <CardDescription>纯视觉组件，三种尺寸，常用于按钮内或小型加载指示</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">小号 (sm):</span>
              <LoadingSpinner size="sm" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">中号 (md):</span>
              <LoadingSpinner size="md" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">大号 (lg):</span>
              <LoadingSpinner size="lg" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>按钮中的加载效果：</Label>
            <div className="flex space-x-2">
              <Button onClick={handleButtonTest} disabled={buttonLoading}>
                {buttonLoading && <LoadingSpinner/>}
                {buttonLoading ? "处理中..." : "点击测试"}
              </Button>
              <Button variant="outline" disabled>
                <LoadingSpinner/>
                禁用状态
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. LoadingState 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>2. LoadingState - 页面级加载状态</CardTitle>
          <CardDescription>带文字说明的完整加载状态，适合页面级或区块级加载</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleLoadingStateTest}>
              点击测试页面级加载 (3秒)
            </Button>
            
            <div className="border rounded-lg min-h-[200px]">
              {showLoadingState ? (
                <LoadingState message="正在加载数据，请稍候..." size="lg" />
              ) : (
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">模拟内容区域</h3>
                  <p className="text-muted-foreground">
                    这里是正常的内容。点击上面的按钮会用 LoadingState 替换这个区域，
                    显示加载状态。这种方式适合整个内容区域的加载。
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded">数据项 1</div>
                    <div className="p-3 bg-muted rounded">数据项 2</div>
                    <div className="p-3 bg-muted rounded">数据项 3</div>
                    <div className="p-3 bg-muted rounded">数据项 4</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. LoadingOverlay 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>3. LoadingOverlay - 遮罩加载组件</CardTitle>
          <CardDescription>在现有内容上覆盖加载遮罩，保持上下文的同时防止误操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleOverlayTest}>
              点击测试遮罩加载 (3秒)
            </Button>
            
            <LoadingOverlay isLoading={overlayLoading} message="正在保存表单数据...">
              <div className="border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">模拟表单</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">组织名称</Label>
                    <Input id="name" placeholder="请输入组织名称" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">组织类型</Label>
                    <Input id="type" placeholder="请输入组织类型" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea id="description" placeholder="请输入组织描述" />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={overlayLoading}>
                    保存
                  </Button>
                  <Button variant="outline" disabled={overlayLoading}>
                    取消
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  注意：当点击&quot;测试遮罩加载&quot;时，这个表单区域会被半透明遮罩覆盖，
                  但内容仍然可见，只是暂时不可交互。这就是 LoadingOverlay 的效果。
                </p>
              </div>
            </LoadingOverlay>
          </div>
        </CardContent>
      </Card>

      {/* 4. Skeleton 骨架屏测试 */}
      <Card>
        <CardHeader>
          <CardTitle>4. Skeleton - 骨架屏加载效果</CardTitle>
          <CardDescription>在内容加载前显示占位符，提供更好的视觉反馈和用户体验</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleSkeletonTest}>
              点击测试骨架屏 (3秒)
            </Button>
            
            {/* 卡片骨架 */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">卡片骨架示例：</h4>
              {showSkeleton ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    用
                  </div>
                  <div>
                    <div className="font-semibold">用户名称</div>
                    <div className="text-sm text-muted-foreground">这是用户的详细描述信息</div>
                  </div>
                </div>
              )}
            </div>

            {/* 列表骨架 */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">列表骨架示例：</h4>
              {showSkeleton ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        图{i}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">列表项标题 {i}</div>
                        <div className="text-sm text-muted-foreground">这是列表项的描述内容</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 表单骨架 */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">表单骨架示例：</h4>
              {showSkeleton ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                  <Skeleton className="h-10 w-[100px]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>组织名称</Label>
                    <Input value="XingRin" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>邮箱</Label>
                    <Input value="admin@example.com" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>描述信息</Label>
                    <Textarea value="这是一段表单内容的描述信息" readOnly />
                  </div>
                  <Button>提交</Button>
                </div>
              )}
            </div>

            {/* 文章骨架 */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold">文章骨架示例：</h4>
              {showSkeleton ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-48 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold">文章标题</h3>
                  <p className="text-muted-foreground">
                    这是文章的第一段内容，包含了一些详细的信息和描述。
                    骨架屏可以很好地展示内容的结构，让用户知道正在加载什么类型的内容。
                  </p>
                  <div className="h-48 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    文章配图
                  </div>
                  <p className="text-muted-foreground">
                    这是文章的第二段内容。骨架屏通过占位符的方式，
                    让用户在等待真实内容时不会看到空白页面，提升了用户体验。
                    它特别适合在网络较慢或数据量较大的场景下使用。
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Sonner Toast 测试 */}
      <Card>
        <CardHeader>
          <CardTitle>5. Sonner Toast - 通知提示组件</CardTitle>
          <CardDescription>轻量级的 Toast 通知组件，支持多种类型和自定义内容</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">基础 Toast 类型：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast("这是一条普通消息")}
                >
                  默认 Toast
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.success("操作成功！数据已保存")}
                >
                  成功 Toast
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.error("操作失败！请检查网络连接")}
                >
                  错误 Toast
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.warning("警告：此操作不可撤销")}
                >
                  警告 Toast
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.info("提示：系统将在5分钟后维护")}
                >
                  信息 Toast
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">带描述的 Toast：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast.success("扫描任务创建成功", {
                    description: "任务ID: SCAN-20240108-001，预计耗时 30 分钟"
                  })}
                >
                  带描述
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.error("域名解析失败", {
                    description: "example.com 无法访问，请检查 DNS 配置"
                  })}
                >
                  错误详情
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">带操作按钮的 Toast：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast.success("文件上传成功", {
                    description: "config.json 已保存",
                    action: {
                      label: "查看",
                      onClick: () => console.log("查看文件")
                    }
                  })}
                >
                  带操作按钮
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast("确认删除此组织？", {
                    description: "此操作不可撤销",
                    action: {
                      label: "确认删除",
                      onClick: () => toast.success("已删除")
                    },
                    cancel: {
                      label: "取消",
                      onClick: () => toast.info("已取消")
                    }
                  })}
                >
                  确认对话框
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">自定义持续时间：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast.success("这条消息1秒后消失", { duration: 1000 })}
                >
                  1秒消失
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.info("这条消息5秒后消失", { duration: 5000 })}
                >
                  5秒消失
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast("这条消息不会自动消失", { duration: Infinity })}
                >
                  持久显示
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">加载状态 Toast：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const loadingId = toast.loading("正在处理扫描任务...")
                    setTimeout(() => {
                      toast.success("扫描完成！", { id: loadingId })
                    }, 3000)
                  }}
                >
                  加载转成功
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const loadingId = toast.loading("正在连接服务器...")
                    setTimeout(() => {
                      toast.error("连接失败", { id: loadingId })
                    }, 3000)
                  }}
                >
                  加载转失败
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Promise Toast：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    const promise = new Promise((resolve) => 
                      setTimeout(() => resolve({ name: "扫描报告.pdf" }), 3000)
                    )
                    toast.promise(promise, {
                      loading: "正在生成报告...",
                      success: (data: any) => `${data.name} 生成成功`,
                      error: "报告生成失败"
                    })
                  }}
                >
                  Promise 成功
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const promise = new Promise((_, reject) => 
                      setTimeout(() => reject(new Error("网络错误")), 3000)
                    )
                    toast.promise(promise, {
                      loading: "正在上传文件...",
                      success: "上传成功",
                      error: "上传失败"
                    })
                  }}
                >
                  Promise 失败
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">批量测试：</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    toast.success("消息 1")
                    setTimeout(() => toast.info("消息 2"), 500)
                    setTimeout(() => toast.warning("消息 3"), 1000)
                    setTimeout(() => toast.error("消息 4"), 1500)
                  }}
                >
                  连续显示
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => toast.dismiss()}
                >
                  关闭全部
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 对比说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用场景对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">LoadingSpinner</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 按钮内加载</li>
                <li>• 表格行内指示</li>
                <li>• 小型组件加载</li>
                <li>• 需要嵌入其他组件</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">LoadingState</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 页面初始加载</li>
                <li>• 数据列表加载</li>
                <li>• 整个内容区域</li>
                <li>• 需要文字说明</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">LoadingOverlay</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 表单提交</li>
                <li>• 数据保存</li>
                <li>• 防止误操作</li>
                <li>• 保持上下文</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Skeleton</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 页面初始渲染</li>
                <li>• 列表/卡片加载</li>
                <li>• 展示内容结构</li>
                <li>• 优化感知性能</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Sonner Toast</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 操作成功/失败</li>
                <li>• 系统通知提示</li>
                <li>• 用户操作反馈</li>
                <li>• 非阻断式提醒</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
