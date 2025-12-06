"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useLogin, useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const router = useRouter()
  const { data: auth, isLoading: authLoading } = useAuth()
  const { mutate: login, isPending } = useLogin()
  
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")

  // 如果已登录，跳转到 dashboard
  React.useEffect(() => {
    if (auth?.authenticated) {
      router.push("/dashboard/")
    }
  }, [auth, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ username, password })
  }

  // 加载中显示 spinner
  if (authLoading) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-muted gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground text-sm">验证登录状态...</p>
      </div>
    )
  }

  // 已登录不显示登录页
  if (auth?.authenticated) {
    return null
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">XingRin Scanner</h1>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="username">用户名</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入账户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">密码</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {isPending ? "登录中..." : "登录"}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
              <div className="bg-primary/5 relative hidden md:block">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Shield className="h-24 w-24 text-primary/20 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-primary/60">安全扫描平台</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Web 应用漏洞扫描与资产管理
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
