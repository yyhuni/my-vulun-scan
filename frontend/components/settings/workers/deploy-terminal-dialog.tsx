"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { IconTerminal2, IconRocket, IconEye, IconTrash } from "@tabler/icons-react"
import type { WorkerNode } from "@/types/worker.types"

interface DeployTerminalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  worker: WorkerNode | null
  onDeployComplete?: () => void
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8888'

export function DeployTerminalDialog({
  open,
  onOpenChange,
  worker,
  onDeployComplete,
}: DeployTerminalDialogProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // 初始化 xterm
  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || terminalInstanceRef.current) return
    
    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')
    const { WebLinksAddon } = await import('@xterm/addon-web-links')
    
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 12, // 减小字体
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
      },
    })
    
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    
    terminal.open(terminalRef.current)
    fitAddon.fit()
    
    terminalInstanceRef.current = terminal
    fitAddonRef.current = fitAddon
    
    // 显示提示
    terminal.writeln('\x1b[1;34m╔════════════════════════════════════════╗\x1b[0m')
    terminal.writeln('\x1b[1;34m║\x1b[0m  \x1b[1;36mXingRin Worker 管理终端\x1b[0m              \x1b[1;34m║\x1b[0m')
    terminal.writeln('\x1b[1;34m╚════════════════════════════════════════╝\x1b[0m')
    terminal.writeln('')
    terminal.writeln(`\x1b[33m目标:\x1b[0m ${worker?.username}@${worker?.ipAddress}:${worker?.sshPort}`)
    terminal.writeln('')
    terminal.writeln('\x1b[90m正在建立 SSH 连接...\x1b[0m')
    
    // 监听窗口大小变化
    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)
    
    // 自动连接 WebSocket
    connectWs()
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [worker])

  // 连接 WebSocket
  const connectWs = useCallback(() => {
    if (!worker || !terminalInstanceRef.current) return
    
    const terminal = terminalInstanceRef.current
    // 如果已有连接先关闭
    if (wsRef.current) {
        wsRef.current.close()
    }
    
    const ws = new WebSocket(`${WS_BASE_URL}/ws/workers/${worker.id}/deploy/`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws
    
    ws.onopen = () => {
      terminal.writeln('\x1b[32m✓ WebSocket 已连接\x1b[0m')
      // 后端会自动开始 SSH 连接
    }
    
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // 二进制数据 - 终端输出
        const decoder = new TextDecoder()
        terminal.write(decoder.decode(event.data))
      } else {
        // JSON 消息
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'connected') {
            setIsConnected(true)
            setError(null)
            // 绑定终端输入
            terminal.onData((data: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data }))
              }
            })
            // 发送终端大小
            ws.send(JSON.stringify({
                type: 'resize',
                cols: terminal.cols,
                rows: terminal.rows,
            }))
          } else if (data.type === 'error') {
            terminal.writeln(`\x1b[31m✗ ${data.message}\x1b[0m`)
            setError(data.message)
          } else if (data.type === 'status') {
            if (data.status === 'online') {
              onDeployComplete?.()
            }
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
    
    ws.onclose = () => {
      terminal.writeln('')
      terminal.writeln('\x1b[33m连接已关闭\x1b[0m')
      setIsConnected(false)
    }
    
    ws.onerror = () => {
      terminal.writeln('\x1b[31m✗ WebSocket 连接失败\x1b[0m')
      setError('连接失败')
    }
  }, [worker, onDeployComplete])

  // 发送终端大小变化
  useEffect(() => {
    if (!isConnected || !wsRef.current || !terminalInstanceRef.current) return
    
    const terminal = terminalInstanceRef.current
    const handleResize = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: terminal.cols,
          rows: terminal.rows,
        }))
      }
    }
    
    terminal.onResize?.(handleResize)
  }, [isConnected])

  // 打开时初始化
  useEffect(() => {
    if (open && worker) {
      // 延迟初始化，确保 DOM 已渲染
      const timer = setTimeout(initTerminal, 100)
      return () => clearTimeout(timer)
    }
  }, [open, worker, initTerminal])

  // 关闭时清理
  const handleClose = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.dispose()
      terminalInstanceRef.current = null
    }
    fitAddonRef.current = null
    setIsConnected(false)
    setError(null)
    onOpenChange(false)
  }

  // 执行部署脚本（后台运行）
  const handleDeploy = () => {
    if (!wsRef.current || !isConnected) return
    wsRef.current.send(JSON.stringify({ type: 'deploy' }))
  }

  // 查看部署进度（attach 到 tmux 会话）
  const handleAttach = () => {
    if (!wsRef.current || !isConnected) return
    wsRef.current.send(JSON.stringify({ type: 'attach' }))
  }

  // 卸载 Worker（后台执行卸载脚本）
  const handleUninstall = () => {
    if (!wsRef.current || !isConnected) return
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('确定要在远程主机上卸载 Worker 并删除相关容器/代码吗？')
      if (!confirmed) return
    }
    wsRef.current.send(JSON.stringify({ type: 'uninstall' }))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[50vw] max-w-[50vw] h-[85vh] flex flex-col p-4">
        <DialogHeader className="px-2">
          <DialogTitle className="flex items-center gap-2">
            <IconTerminal2 className="h-5 w-5" />
            终端: {worker?.name}
            {isConnected && (
              <Badge variant="default" className="bg-green-600">已连接</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {worker?.username}@{worker?.ipAddress}:{worker?.sshPort}
          </DialogDescription>
        </DialogHeader>

        {/* xterm 终端容器 */}
        <div 
          ref={terminalRef} 
          className="flex-1 rounded-md overflow-hidden bg-[#1a1b26]"
        />

        <DialogFooter className="flex-row gap-2 justify-end">
          {/* 已连接时显示操作按钮 */}
          {isConnected && (
            <>
              <Button onClick={handleDeploy} variant="default">
                <IconRocket className="mr-1 h-4 w-4" />
                执行部署
              </Button>
              <Button onClick={handleUninstall} variant="destructive">
                <IconTrash className="mr-1 h-4 w-4" />
                卸载 Worker
              </Button>
              <Button onClick={handleAttach} variant="secondary">
                <IconEye className="mr-1 h-4 w-4" />
                查看进度
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={handleClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
