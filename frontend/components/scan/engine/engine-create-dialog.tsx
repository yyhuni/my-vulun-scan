"use client"

import React, { useState } from "react"
import { FileCode, Save, X, AlertCircle, CheckCircle2 } from "lucide-react"
import Editor from "@monaco-editor/react"
import * as yaml from "js-yaml"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useTheme } from "next-themes"

interface EngineCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (name: string, yamlContent: string) => Promise<void>
}

/**
 * 新建引擎弹窗
 */
export function EngineCreateDialog({
  open,
  onOpenChange,
  onSave,
}: EngineCreateDialogProps) {
  const [engineName, setEngineName] = useState("")
  const [yamlContent, setYamlContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [yamlError, setYamlError] = useState<{ message: string; line?: number; column?: number } | null>(null)
  const { theme } = useTheme()
  const editorRef = React.useRef<any>(null)

  // 默认 YAML 模板
  const defaultYaml = `# 引擎配置示例
# 
# 说明：
# - 这是引擎配置（engine_config）的示例文件
# - 实际配置存储在数据库的 ScanEngine.configuration 字段中
#
# 必需参数：
# - enabled: 是否启用工具（true/false）
# - timeout: 超时时间（秒），工具执行超过此时间会被强制终止
#
# 使用方式：
# - 在前端创建扫描引擎时，将此配置保存到数据库
# - 执行扫描时，从数据库读取配置并传递给 Flow
# - 取消注释可选参数即可启用


# ==================== 子域名发现 ====================
subdomain_discovery:
  tools:
    subfinder:
      enabled: true
      timeout: 600      # 10 分钟（必需）
      # threads: 10     # 可选，线程数
      
    amass_passive:
      enabled: true
      timeout: 600      # 10 分钟（必需）
      
    amass_active:
      enabled: true
      timeout: 1800     # 30 分钟（必需）
      # wordlist: /usr/src/wordlist/deepmagic.com-prefixes-top50000.txt  # 可选，字典文件
      
    sublist3r:
      enabled: true
      timeout: 900      # 15 分钟（必需）
      # threads: 50     # 可选，线程数
      
    oneforall:
      enabled: true
      timeout: 1200     # 20 分钟（必需）


# ==================== 端口扫描 ====================
port_scan:
  tools:
    naabu_active:
      enabled: true
      timeout: auto     # 自动计算（根据：目标数 × 端口数 × 0.5秒）
                        # 例如：100个域名 × 100个端口 × 0.5 = 5000秒
                        #       10个域名 × 1000个端口 × 0.5 = 5000秒
                        # 超时范围：60秒 ~ 2天（172800秒）
                        # 或者手动指定：timeout: 3600
      threads: 5        # 可选，并发连接数（默认 5）
      # ports: 1-65535    # 可选，扫描端口范围（默认 1-65535）
      top-ports: 100    # 可选，Scan for nmap top 100 ports（影响 timeout 计算）
      rate: 10          # 可选，扫描速率（默认 10）
      
    naabu_passive:
      enabled: true
      timeout: auto     # 自动计算（被动扫描通常较快，端口数默认为 100）
      # 被动扫描，使用被动数据源，无需额外配置


# ==================== 站点扫描 ====================
site_scan:
  tools:
    httpx:
      enabled: true
      timeout: auto         # 自动计算（根据URL数量，每个URL 1秒）
                            # 或者手动指定：timeout: 3600
      # threads: 50         # 可选，并发线程数（httpx 默认 50）
      # rate_limit: 150     # 可选，每秒发送的请求数量（httpx 默认 150）
      # request_timeout: 10  # 可选，单个请求的超时时间（httpx 默认 10）秒
      # retries: 2          # 可选，请求失败重试次数
      # proxy: http://127.0.0.1:8080  # 可选，HTTP 代理地址


# ==================== 目录扫描 ====================
directory_scan:
  tools:
    ffuf:
      enabled: true
      timeout: auto                            # 自动计算超时时间（根据字典行数）
                                               # 计算公式：字典行数 × 0.02秒/词
                                               # 超时范围：60秒 ~ 7200秒（2小时）
                                               # 也可以手动指定固定超时（如 300）
      wordlist: ~/Desktop/dirsearch_dicc.txt   # 词表文件路径（必需）
                                               # ffuf会逐行读取该文件，将每行作为FUZZ关键字的替换值
      delay: 0.1-2.0                         # Seconds of delay between requests, or a range of random delay
                                               # For example "0.1" or "0.1-2.0"
      threads: 10                            # Number of concurrent threads (default: 40)
      request_timeout: 10                    # HTTP request timeout in seconds (default: 10)
      match_codes: 200,201,301,302,401,403   # Match HTTP status codes, comma separated
      # rate: 0                                # Rate of requests per second (default: 0)


# ==================== URL 获取 ====================
url_fetch:
  tools:
    waymore:
      enabled: true
      timeout: auto      # 工具级别总超时：自动计算（根据站点数量）
                        # waymore 从历史归档中获取 URL，通常需要较长时间
                        # 输入类型：domain（域名级别，自动去重同域名站点）
    
    katana:
      enabled: true
      timeout: auto         # 工具级别总超时：自动计算（根据站点数量）
                            # 或手动指定：timeout: 300
      
      # ========== 核心功能参数（已在命令中固定开启） ==========
      # -jc: JavaScript 爬取 + 自动解析 .js 文件里的所有端点（最重要）
      # -xhr: 从 JS 中提取 XHR/Fetch 请求的 API 路径（再多挖 10-20% 隐藏接口）
      # -kf all: 自动 fuzz 所有已知敏感文件（.env、.git、backup、config 等 5000+ 条）
      # -fs rdn: 智能过滤重复+噪声路径（分页、?id=1/2/3 全干掉，输出极干净）
      
      # ========== 可选参数（推荐配置） ==========
      depth: 5              # 爬取最大深度（平衡深度与时间，默认 3，推荐 5）
      threads: 10           # 全局并发数（极低并发最像真人，推荐 10）
      rate-limit: 30        # 全局硬限速：每秒最多 30 个请求（WAF 几乎不报警）
      random-delay: 1       # 每次请求之间随机延迟 0.5~1.5 秒（再加一层人性化）
      retry: 2              # 失败请求自动重试 2 次（网络抖动不丢包）
      request-timeout: 12   # 单请求超时 12 秒（防卡死，katana 参数名是 -timeout）
      
      # 输入类型：url（站点级别，每个站点单独爬取）
    
    uro:
      enabled: true
      timeout: auto         # 自动计算（根据 URL 数量，每 100 个约 1 秒）
                            # 范围：30 秒 ~ 300 秒
                            # 或手动指定：timeout: 60
      
      # ========== 可选参数 ==========
      # whitelist:          # 只保留指定扩展名的 URL（如：php,asp,jsp）
      #   - php
      #   - asp
      # blacklist:            # 排除指定扩展名的 URL（静态资源）
      #   - jpg
      #   - jpeg
      #   - png
      #   - gif
      #   - svg
      #   - ico
      #   - css
      #   - woff
      #   - woff2
      #   - ttf
      #   - eot
      #   - mp4
      #   - mp3
      #   - pdf
      # filters:             # 额外的过滤规则，参考 uro 文档
      #   - hasparams        # 只保留有参数的 URL
      #   - hasext           # 只保留有扩展名的 URL
      #   - vuln             # 只保留可能有漏洞的 URL
      
      # 用途：清理合并后的 URL 列表，去除冗余和无效 URL
      # 输入类型：merged_file（合并后的 URL 文件）
      # 输出：清理后的 URL 列表
    
    httpx:
      enabled: true
      timeout: auto         # 自动计算（根据 URL 数量，每个 URL 1 秒）
                            # 或手动指定：timeout: 600
      # threads: 50         # 可选，并发线程数（httpx 默认 50）
      # rate-limit: 150     # 可选，每秒发送的请求数量（httpx 默认 150）
      # request-timeout: 10  # 可选，单个请求的超时时间（httpx 默认 10）秒
      # retries: 2          # 可选，请求失败重试次数
      
      # 用途：判断 URL 存活，过滤无效 URL
      # 输入类型：url_file（URL 列表文件）
      # 输出：存活的 URL 及其响应信息（status, title, server, tech 等）`

  // 当对话框打开时，重置表单
  React.useEffect(() => {
    if (open) {
      setEngineName("")
      setYamlContent(defaultYaml)
      setYamlError(null)
    }
  }, [open])

  // 验证 YAML 语法
  const validateYaml = (content: string) => {
    if (!content.trim()) {
      setYamlError(null)
      return true
    }

    try {
      yaml.load(content)
      setYamlError(null)
      return true
    } catch (error) {
      const yamlError = error as yaml.YAMLException
      setYamlError({
        message: yamlError.message,
        line: yamlError.mark?.line ? yamlError.mark.line + 1 : undefined,
        column: yamlError.mark?.column ? yamlError.mark.column + 1 : undefined,
      })
      return false
    }
  }

  // 处理编辑器内容变化
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || ""
    setYamlContent(newValue)
    validateYaml(newValue)
  }

  // 处理编辑器挂载
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    setIsEditorReady(true)
  }

  // 处理保存
  const handleSave = async () => {
    // 验证引擎名称
    if (!engineName.trim()) {
      toast.error("请输入引擎名称")
      return
    }

    // YAML 验证
    if (!yamlContent.trim()) {
      toast.error("配置内容不能为空")
      return
    }

    if (!validateYaml(yamlContent)) {
      toast.error("YAML 语法错误", {
        description: yamlError?.message,
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (onSave) {
        await onSave(engineName, yamlContent)
      } else {
        // TODO: 调用实际的 API 创建引擎
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      toast.success("引擎创建成功", {
        description: `引擎 "${engineName}" 已成功创建`,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create engine:", error)
      toast.error("引擎创建失败", {
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理关闭
  const handleClose = () => {
    if (engineName.trim() || yamlContent !== defaultYaml) {
      const confirmed = window.confirm("您有未保存的更改，确定要关闭吗？")
      if (!confirmed) return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-w-[calc(100%-2rem)] h-[90vh] flex flex-col p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              新建扫描引擎
            </DialogTitle>
            <DialogDescription>
              创建新的扫描引擎配置，使用 Monaco Editor 编辑 YAML 配置文件，支持语法高亮、自动补全和错误提示。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="flex flex-col h-full gap-4">
              {/* 引擎名称输入 */}
              <div className="space-y-2">
                <Label htmlFor="engine-name">
                  引擎名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="engine-name"
                  value={engineName}
                  onChange={(e) => setEngineName(e.target.value)}
                  placeholder="请输入引擎名称，例如：全面扫描引擎"
                  disabled={isSubmitting}
                  className="max-w-md"
                />
              </div>

              {/* YAML 编辑器 */}
              <div className="flex flex-col flex-1 min-h-0 gap-2">
                <div className="flex items-center justify-between">
                  <Label>YAML 配置</Label>
                  {/* 语法验证状态 */}
                  <div className="flex items-center gap-2">
                    {yamlContent.trim() && (
                      yamlError ? (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>语法错误</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>语法正确</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className={`border rounded-md overflow-hidden flex-1 ${yamlError ? 'border-destructive' : ''}`}>
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={yamlContent}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      wordWrap: "off",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      insertSpaces: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      folding: true,
                      foldingStrategy: "indentation",
                      showFoldingControls: "always",
                      bracketPairColorization: {
                        enabled: true,
                      },
                      padding: {
                        top: 16,
                        bottom: 16,
                      },
                      readOnly: isSubmitting,
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                          <p className="text-sm text-muted-foreground">加载编辑器...</p>
                        </div>
                      </div>
                    }
                  />
                </div>

                {/* 错误信息显示 */}
                {yamlError && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-destructive mb-1">
                        {yamlError.line && yamlError.column
                          ? `第 ${yamlError.line} 行，第 ${yamlError.column} 列`
                          : "YAML 语法错误"}
                      </p>
                      <p className="text-muted-foreground">{yamlError.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !engineName.trim() || !!yamlError || !isEditorReady}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  创建中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  创建引擎
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

