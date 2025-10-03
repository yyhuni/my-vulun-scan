"use client"
import { FileQuestion, AlertTriangle, ServerCrash, Shield, ShieldX, WifiOff, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FallbackPageProps {
  statusCode?: number
  type?: "error" | "notfound" // 保持向后兼容
  title?: string
  description?: string
  showRetry?: boolean
  onRetry?: () => void
}

export default function FallbackPage({ 
  statusCode, 
  type, 
  title, 
  description, 
  showRetry = false,
  onRetry 
}: FallbackPageProps) {
  // 如果提供了 type 参数，转换为对应的状态码（向后兼容）
  const finalStatusCode = statusCode || (type === "notfound" ? 404 : 500)
  
  // 根据状态码获取配置
  const getErrorConfig = (code: number) => {
    switch (code) {
      case 400:
        return {
          icon: <AlertTriangle className="h-10 w-10 text-orange-600" />,
          defaultTitle: "400",
          defaultDescription: "请求错误，请检查您的输入",
          bgColor: "bg-orange-100"
        }
      case 401:
        return {
          icon: <Shield className="h-10 w-10 text-red-600" />,
          defaultTitle: "401",
          defaultDescription: "未授权访问，请先登录",
          bgColor: "bg-red-100"
        }
      case 403:
        return {
          icon: <ShieldX className="h-10 w-10 text-red-600" />,
          defaultTitle: "403",
          defaultDescription: "禁止访问，您没有权限访问此资源",
          bgColor: "bg-red-100"
        }
      case 404:
        return {
          icon: <FileQuestion className="h-10 w-10 text-slate-400" />,
          defaultTitle: "404",
          defaultDescription: "页面未找到，您访问的页面不存在",
          bgColor: "bg-slate-100"
        }
      case 500:
        return {
          icon: <ServerCrash className="h-10 w-10 text-red-600" />,
          defaultTitle: "500",
          defaultDescription: "服务器内部错误，请稍后重试",
          bgColor: "bg-red-100"
        }
      case 502:
        return {
          icon: <WifiOff className="h-10 w-10 text-gray-600" />,
          defaultTitle: "502",
          defaultDescription: "网关错误，服务暂时不可用",
          bgColor: "bg-gray-100"
        }
      case 503:
        return {
          icon: <Clock className="h-10 w-10 text-yellow-600" />,
          defaultTitle: "503",
          defaultDescription: "服务不可用，系统维护中",
          bgColor: "bg-yellow-100"
        }
      default:
        return {
          icon: <AlertTriangle className="h-10 w-10 text-red-600" />,
          defaultTitle: "错误",
          defaultDescription: "页面发生错误，请稍后重试",
          bgColor: "bg-red-100"
        }
    }
  }

  const config = getErrorConfig(finalStatusCode)
  const displayTitle = title || config.defaultTitle
  const displayDescription = description || config.defaultDescription

  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <div className="space-y-6 flex flex-col items-center justify-center max-w-md text-center">
        <div className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center`}>
          {config.icon}
        </div>
        
        <div className="space-y-2">
          <div className="text-3xl font-bold text-slate-900">
            {displayTitle}
          </div>
          <div className="text-muted-foreground">
            {displayDescription}
          </div>
        </div>

        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="outline">
            重新尝试
          </Button>
        )}
      </div>
    </div>
  )
} 