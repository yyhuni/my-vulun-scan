import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 - 星环 | 攻击面管理平台",
  description: "星环 (Xingrin) - 攻击面管理平台 (ASM)，提供自动化资产发现与漏洞扫描",
}

/**
 * 登录页面布局
 * 不包含侧边栏和头部
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
