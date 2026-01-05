"use client"

import { useMemo, useRef, useEffect } from "react"
import AnsiToHtml from "ansi-to-html"

interface AnsiLogViewerProps {
  content: string
  className?: string
}

// 日志级别颜色配置
const LOG_LEVEL_COLORS: Record<string, string> = {
  DEBUG: "#4ec9b0",    // cyan
  INFO: "#6a9955",     // green
  WARNING: "#dcdcaa",  // yellow
  WARN: "#dcdcaa",     // yellow
  ERROR: "#f44747",    // red
  CRITICAL: "#f44747", // red (bold handled separately)
}

// 创建 ANSI 转换器实例
const ansiConverter = new AnsiToHtml({
  fg: "#d4d4d4",
  bg: "#1e1e1e",
  newline: false,  // 我们自己处理换行
  escapeXML: true,
  colors: {
    0: "#1e1e1e",   // black
    1: "#f44747",   // red
    2: "#6a9955",   // green
    3: "#dcdcaa",   // yellow
    4: "#569cd6",   // blue
    5: "#c586c0",   // magenta
    6: "#4ec9b0",   // cyan
    7: "#d4d4d4",   // white
    8: "#808080",   // bright black
    9: "#f44747",   // bright red
    10: "#6a9955",  // bright green
    11: "#dcdcaa",  // bright yellow
    12: "#569cd6",  // bright blue
    13: "#c586c0",  // bright magenta
    14: "#4ec9b0",  // bright cyan
    15: "#ffffff",  // bright white
  },
})

// 检测内容是否包含 ANSI 颜色码
function hasAnsiCodes(text: string): boolean {
  // ANSI 转义序列通常以 ESC[ 开头（\x1b[ 或 \u001b[）
  return /\x1b\[|\u001b\[/.test(text)
}

// 解析纯文本日志内容，为日志级别添加颜色
function colorizeLogContent(content: string): string {
  // 匹配日志格式: [时间] [级别] [模块:行号] 消息
  // 例如: [2025-01-05 10:30:00] [INFO] [apps.scan:123] 消息内容
  const logLineRegex = /^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]) (\[(DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL)\]) (.*)$/
  
  return content
    .split("\n")
    .map((line) => {
      const match = line.match(logLineRegex)
      
      if (match) {
        const [, timestamp, levelBracket, level, rest] = match
        const color = LOG_LEVEL_COLORS[level] || "#d4d4d4"
        // ansiConverter.toHtml 已经处理了 HTML 转义
        const escapedTimestamp = ansiConverter.toHtml(timestamp)
        const escapedLevelBracket = ansiConverter.toHtml(levelBracket)
        const escapedRest = ansiConverter.toHtml(rest)
        
        // 时间戳灰色，日志级别带颜色，其余默认色
        return `<span style="color:#808080">${escapedTimestamp}</span> <span style="color:${color};font-weight:${level === "CRITICAL" ? "bold" : "normal"}">${escapedLevelBracket}</span> ${escapedRest}`
      }
      
      // 非标准格式的行，也进行 HTML 转义
      return ansiConverter.toHtml(line)
    })
    .join("\n")
}

export function AnsiLogViewer({ content, className }: AnsiLogViewerProps) {
  const containerRef = useRef<HTMLPreElement>(null)
  const isAtBottomRef = useRef(true)  // 跟踪用户是否在底部

  // 解析日志并添加颜色
  // 支持两种模式：ANSI 颜色码和纯文本日志级别解析
  const htmlContent = useMemo(() => {
    if (!content) return ""
    
    // 如果包含 ANSI 颜色码，直接转换
    if (hasAnsiCodes(content)) {
      return ansiConverter.toHtml(content)
    }
    
    // 否则解析日志级别添加颜色
    return colorizeLogContent(content)
  }, [content])

  // 监听滚动事件，检测用户是否在底部
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // 允许 30px 的容差，认为在底部附近
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 30
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // 只有用户在底部时才自动滚动
  useEffect(() => {
    if (containerRef.current && isAtBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [htmlContent])

  return (
    <pre
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
        margin: 0,
        padding: "12px",
        overflow: "auto",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        fontSize: "12px",
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
