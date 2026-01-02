"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search } from "lucide-react"
import { SmartFilterInput, type FilterField } from "@/components/common/smart-filter-input"
import { SearchResultCard } from "./search-result-card"
import type { SearchResult, SearchState } from "@/types/search.types"

// 搜索过滤字段配置
const SEARCH_FILTER_FIELDS: FilterField[] = [
  { key: "domain", label: "Domain", description: "域名" },
  { key: "ip", label: "IP", description: "IP 地址" },
  { key: "title", label: "Title", description: "页面标题" },
  { key: "tech", label: "Tech", description: "技术栈" },
  { key: "host", label: "Host", description: "主机名" },
  { key: "status", label: "Status", description: "HTTP 状态码" },
  { key: "port", label: "Port", description: "端口号" },
]

// 搜索示例
const SEARCH_FILTER_EXAMPLES = [
  'domain="example.com"',
  'ip="192.168.1.1"',
  'title="后台管理"',
  'tech="nginx" && status="200"',
  'host="api.*" || host="admin.*"',
]

// 假数据
const mockResults: SearchResult[] = [
  {
    id: "1",
    host: "www.example.com",
    title: "海南灯光音响租赁",
    ip: "114.80.211.9",
    technologies: [
      "jQuery 3.6.0",
      "ASP.NET 4.8",
      "Nginx 1.18.0",
      "PHP 7.4.33",
      "Redis 6.2",
      "MySQL 8.0",
      "Bootstrap 5.3",
      "Vue.js 3.4",
      "Webpack 5.90",
      "Node.js 20.11",
      "Express 4.18",
      "MongoDB 7.0",
      "Docker 24.0",
      "Kubernetes 1.29",
      "AWS CloudFront",
      "Cloudflare CDN",
      "Let's Encrypt",
      "Google Analytics",
      "reCAPTCHA v3",
      "Moment.js",
      "Lodash 4.17",
      "Axios 1.6",
    ],
    responseHeaders: {
      "HTTP/1.1": "200 OK",
      "Content-Type": "text/html; charset=utf-8",
      Server: "nginx/1.18.0",
      "X-Powered-By": "PHP/7.4",
      "Cache-Control": "no-cache",
      "Set-Cookie": "session=abc123; HttpOnly",
    },
    responseBody: `<!DOCTYPE html>
<html>
<head>
  <title>海南灯光音响租赁</title>
  <meta charset="utf-8">
</head>
<body>
  <div id="app">
    <header>Welcome to our website</header>
    <main>Content here...</main>
  </div>
</body>
</html>`,
    vulnerabilities: [
      {
        id: "v1",
        name: "SQL Injection in login.asp",
        severity: "high",
        source: "Nuclei",
        vulnType: "Injection",
      },
      {
        id: "v2",
        name: "XSS in search parameter",
        severity: "medium",
        source: "Custom",
        vulnType: "XSS",
      },
      {
        id: "v3",
        name: "Directory Traversal",
        severity: "high",
        source: "Nuclei",
        vulnType: "Path Traversal",
      },
      {
        id: "v4",
        name: "Outdated jQuery Version",
        severity: "low",
        source: "Wappalyzer",
        vulnType: "Outdated Software",
      },
    ],
  },
  {
    id: "2",
    host: "api.example.com",
    title: "API Gateway",
    ip: "114.80.211.10",
    technologies: [
      "Node.js 20.11",
      "Express 4.18",
      "MongoDB 7.0",
      "Redis 7.2",
      "Docker 24.0",
      "Swagger UI",
      "JWT",
      "Helmet.js",
      "PM2",
      "Winston",
      "Mongoose 8.0",
      "GraphQL",
      "Apollo Server",
    ],
    responseHeaders: {
      "HTTP/1.1": "200 OK",
      "Content-Type": "application/json",
      Server: "nginx",
      "X-Request-Id": "req-123456",
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Remaining": "999",
    },
    responseBody: `{"status":"ok","version":"1.0.0","endpoints":["/api/v1/users","/api/v1/products","/api/v1/orders"]}`,
    vulnerabilities: [],
  },
  {
    id: "3",
    host: "admin.example.com",
    title: "Admin Dashboard",
    ip: "114.80.211.11",
    technologies: [
      "React 18.2",
      "TypeScript 5.3",
      "Tailwind CSS 3.4",
      "Vite 5.1",
      "React Router 6.22",
      "Zustand 4.5",
      "TanStack Query 5.24",
      "Radix UI",
      "Lucide Icons",
      "date-fns",
      "Zod",
      "React Hook Form",
    ],
    responseHeaders: {
      "HTTP/1.1": "200 OK",
      "Content-Type": "text/html",
      Server: "cloudflare",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'",
      "Strict-Transport-Security": "max-age=31536000",
    },
    responseBody: `<!DOCTYPE html><html><head><title>Admin Dashboard</title></head><body><div id="root"></div></body></html>`,
    vulnerabilities: [
      {
        id: "v5",
        name: "Sensitive Data Exposure",
        severity: "critical",
        source: "Nuclei",
        vulnType: "Information Disclosure",
      },
      {
        id: "v6",
        name: "Missing Rate Limiting",
        severity: "medium",
        source: "Custom",
        vulnType: "Security Misconfiguration",
      },
    ],
  },
  {
    id: "4",
    host: "shop.example.com",
    title: "在线商城 - 品质生活从这里开始",
    ip: "114.80.211.12",
    technologies: [
      "Next.js 14.1",
      "React 18.2",
      "TypeScript 5.3",
      "Prisma 5.10",
      "PostgreSQL 16",
      "Stripe",
      "PayPal SDK",
      "Algolia Search",
      "Cloudinary",
      "SendGrid",
      "Sentry",
      "Vercel Analytics",
      "Next Auth",
      "SWR",
      "Framer Motion",
      "Headless UI",
    ],
    responseHeaders: {
      "HTTP/1.1": "200 OK",
      "Content-Type": "text/html; charset=utf-8",
      Server: "Vercel",
      "X-Vercel-Cache": "HIT",
      "Cache-Control": "s-maxage=1, stale-while-revalidate",
    },
    responseBody: `<!DOCTYPE html><html><head><title>在线商城</title><meta name="description" content="品质生活从这里开始"></head><body><div id="__next"></div></body></html>`,
    vulnerabilities: [
      {
        id: "v7",
        name: "IDOR in Order API",
        severity: "high",
        source: "Manual",
        vulnType: "Broken Access Control",
      },
    ],
  },
]

export function SearchPage() {
  const [searchState, setSearchState] = useState<SearchState>("initial")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = async (_filters: unknown, rawQuery: string) => {
    if (!rawQuery.trim()) return

    setQuery(rawQuery)
    setSearchState("searching")

    // 模拟搜索延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    setResults(mockResults)
    setSearchState("results")
  }

  return (
    <div className="flex-1 w-full flex flex-col">
      <AnimatePresence mode="wait">
        {searchState === "initial" && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-4 -mt-50"
          >
            <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
              <h1 className="text-3xl font-semibold text-foreground flex items-center gap-3">
                <Search className="h-8 w-8" />
                资产搜索
              </h1>

              <SmartFilterInput
                fields={SEARCH_FILTER_FIELDS}
                examples={SEARCH_FILTER_EXAMPLES}
                placeholder='domain="example.com" && tech="nginx"'
                value={query}
                onSearch={handleSearch}
                className="w-full [&_input]:h-12 [&_input]:text-base [&_button]:h-12 [&_button]:w-12 [&_button]:p-0"
              />

              <p className="text-sm text-muted-foreground">
                点击搜索框查看可用字段和语法
              </p>
            </div>
          </motion.div>
        )}

        {searchState === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="text-muted-foreground">搜索中...</span>
            </div>
          </motion.div>
        )}

        {searchState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            {/* 顶部搜索栏 */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3"
            >
              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <SmartFilterInput
                  fields={SEARCH_FILTER_FIELDS}
                  examples={SEARCH_FILTER_EXAMPLES}
                  placeholder='domain="example.com" && tech="nginx"'
                  value={query}
                  onSearch={handleSearch}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  找到 {results.length} 条结果
                </span>
              </div>
            </motion.div>

            {/* 搜索结果列表 */}
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <SearchResultCard result={result} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
