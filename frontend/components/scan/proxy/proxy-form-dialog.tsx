"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { IconLoader2, IconPlugConnected } from "@tabler/icons-react"
import type { Proxy, ProxyType, CreateProxyRequest, UpdateProxyRequest } from "@/types/proxy.types"
import { PROXY_TYPE_OPTIONS } from "@/types/proxy.types"

// 表单值类型
interface ProxyFormValues {
  name: string
  type: ProxyType
  host: string
  port: number
  username: string
  password: string
  description: string
  testUrl: string
  isEnabled: boolean
}

interface ProxyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy?: Proxy | null  // 编辑时传入
  onSave: (data: CreateProxyRequest | UpdateProxyRequest) => Promise<void>
  onTest?: (data: Partial<ProxyFormValues>) => Promise<void>
  isLoading?: boolean
  isTesting?: boolean
}

/**
 * 代理表单对话框
 * 用于创建和编辑代理配置
 */
export function ProxyFormDialog({
  open,
  onOpenChange,
  proxy,
  onSave,
  onTest,
  isLoading = false,
  isTesting = false,
}: ProxyFormDialogProps) {
  const isEditing = !!proxy

  const form = useForm<ProxyFormValues>({
    defaultValues: {
      name: "",
      type: "http",
      host: "",
      port: 8080,
      username: "",
      password: "",
      description: "",
      testUrl: "",
      isEnabled: true,
    },
  })

  // 编辑时填充表单数据
  React.useEffect(() => {
    if (proxy) {
      form.reset({
        name: proxy.name,
        type: proxy.type,
        host: proxy.host,
        port: proxy.port,
        username: proxy.username || "",
        password: "",  // 密码不回显
        description: proxy.description || "",
        testUrl: proxy.testUrl || "",
        isEnabled: proxy.isEnabled,
      })
    } else {
      form.reset({
        name: "",
        type: "http",
        host: "",
        port: 8080,
        username: "",
        password: "",
        description: "",
        testUrl: "",
        isEnabled: true,
      })
    }
  }, [proxy, form])

  // 提交表单
  const handleSubmit = async (values: ProxyFormValues) => {
    const data: CreateProxyRequest | UpdateProxyRequest = {
      name: values.name,
      type: values.type as ProxyType,
      host: values.host,
      port: values.port,
      isEnabled: values.isEnabled,
    }

    if (values.username) data.username = values.username
    if (values.password) data.password = values.password
    if (values.description) data.description = values.description
    if (values.testUrl) data.testUrl = values.testUrl

    await onSave(data)
    onOpenChange(false)
  }

  // 测试连接
  const handleTest = async () => {
    if (!onTest) return

    const values = form.getValues()
    await onTest({
      type: values.type as ProxyType,
      host: values.host,
      port: values.port,
      username: values.username || undefined,
      password: values.password || undefined,
      testUrl: values.testUrl || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑代理" : "新建代理"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "修改代理配置信息" : "添加一个新的代理配置"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 代理名称 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入代理名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 代理类型 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>类型</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择代理类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROXY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 主机和端口 */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>主机</FormLabel>
                    <FormControl>
                      <Input placeholder="127.0.0.1 或 proxy.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="8080" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 认证信息 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名（可选）</FormLabel>
                    <FormControl>
                      <Input placeholder="代理用户名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码（可选）</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEditing ? "留空保持不变" : "代理密码"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 测试 URL */}
            <FormField
              control={form.control}
              name="testUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>测试 URL（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.google.com" {...field} />
                  </FormControl>
                  <FormDescription>用于测试代理连接的目标地址</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 描述 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="代理用途说明..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 启用状态 */}
            <FormField
              control={form.control}
              name="isEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>启用代理</FormLabel>
                    <FormDescription>关闭后扫描任务将不使用此代理</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {/* 测试按钮 */}
              {onTest && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTest}
                  disabled={isTesting || !form.getValues("host") || !form.getValues("port")}
                >
                  {isTesting ? (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <IconPlugConnected className="mr-2 h-4 w-4" />
                  )}
                  测试连接
                </Button>
              )}

              {/* 保存按钮 */}
              <Button type="submit" disabled={isLoading}>
                {isLoading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "保存修改" : "创建代理"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
