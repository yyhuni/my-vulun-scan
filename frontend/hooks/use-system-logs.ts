import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"

import { systemLogService } from "@/services/system-log.service"
import { useToastMessages } from "@/lib/toast-helpers"

/**
 * 获取日志文件列表
 */
export function useLogFiles() {
  return useQuery({
    queryKey: ["system", "logs", "files"],
    queryFn: () => systemLogService.getLogFiles(),
    staleTime: 30 * 1000, // 30秒内不重新请求
  })
}

/**
 * 获取日志内容
 */
export function useSystemLogs(options?: {
  file?: string
  lines?: number
  enabled?: boolean
  autoRefresh?: boolean
}) {
  const hadErrorRef = useRef(false)
  const toastMessages = useToastMessages()

  const query = useQuery({
    queryKey: ["system", "logs", { file: options?.file ?? null, lines: options?.lines ?? null }],
    queryFn: () => systemLogService.getSystemLogs({ file: options?.file, lines: options?.lines }),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.autoRefresh ? 2000 : false,
    refetchIntervalInBackground: options?.autoRefresh ?? false,
    retry: false,
  })

  useEffect(() => {
    if (query.isError && !hadErrorRef.current) {
      hadErrorRef.current = true
      toastMessages.error('toast.systemLog.fetch.error')
    }

    if (query.isSuccess && hadErrorRef.current) {
      hadErrorRef.current = false
      toastMessages.success('toast.systemLog.fetch.recovered')
    }
  }, [query.isError, query.isSuccess, toastMessages])

  return query
}
