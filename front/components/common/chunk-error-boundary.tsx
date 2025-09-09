'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  copiedError: boolean
  copiedStack: boolean
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      copiedError: false,
      copiedStack: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 检查是否是 ChunkLoadError
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Loading CSS chunk')
    
    return {
      hasError: true,
      error: isChunkError ? error : error,
      copiedError: false,
      copiedStack: false
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 如果是 ChunkLoadError，尝试自动刷新
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      console.log('Detected ChunkLoadError, will attempt auto-refresh in 2 seconds')
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }
  }

  handleRefresh = () => {
    // 清除错误状态
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    
    // 刷新页面
    window.location.reload()
  }

  handleRetry = () => {
    // 只重置错误状态，不刷新页面
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      copiedError: false,
      copiedStack: false
    })
  }

  handleCopyError = async () => {
    if (this.state.error) {
      try {
        await navigator.clipboard.writeText(this.state.error.toString())
        this.setState({ copiedError: true })
        setTimeout(() => {
          this.setState({ copiedError: false })
        }, 2000)
      } catch (err) {
        console.error('Failed to copy error message:', err)
      }
    }
  }

  handleCopyStack = async () => {
    if (this.state.errorInfo?.componentStack) {
      try {
        await navigator.clipboard.writeText(this.state.errorInfo.componentStack)
        this.setState({ copiedStack: true })
        setTimeout(() => {
          this.setState({ copiedStack: false })
        }, 2000)
      } catch (err) {
        console.error('Failed to copy stack trace:', err)
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isChunkError = this.state.error?.name === 'ChunkLoadError' || 
                          this.state.error?.message.includes('Loading chunk')

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-lg">
                {isChunkError ? '页面加载失败' : '应用出现错误'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 text-center">
                {isChunkError ? (
                  <>
                    <p>页面资源加载失败，这通常是由于网络问题或缓存问题导致的。</p>
                    <p className="mt-2 text-xs text-gray-500">
                      系统将在 2 秒后自动刷新页面...
                    </p>
                  </>
                ) : (
                  <p>应用遇到了一个意外错误，请尝试刷新页面。</p>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs bg-gray-100 p-3 rounded border">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                    错误详情 (点击展开)
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="bg-white p-2 rounded border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-red-600">错误信息:</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={this.handleCopyError}
                        >
                          {this.state.copiedError ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              已复制
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              复制
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-gray-800 break-words overflow-wrap-anywhere">
                        {this.state.error.toString()}
                      </div>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div className="bg-white p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-blue-600">组件堆栈:</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={this.handleCopyStack}
                          >
                            {this.state.copiedStack ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                已复制
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                复制
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words overflow-auto max-h-32 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={this.handleRefresh}
                  className="flex-1"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新页面
                </Button>
                {!isChunkError && (
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    重试
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}


