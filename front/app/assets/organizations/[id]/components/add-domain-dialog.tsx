"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AddDomainDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationName: string
  onAddDomain: (domains: string[]) => void
}

import type { ValidationResult } from "@/types/domain.types"

export function AddDomainDialog({
  isOpen,
  onClose,
  organizationName,
  onAddDomain,
}: AddDomainDialogProps) {
  const [domainsInput, setDomainsInput] = useState("")
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 当输入变化时验证域名
  useEffect(() => {
    if (!domainsInput.trim()) {
      setValidationResults([])
      return
    }

    const validateDomains = async () => {
      setIsValidating(true)
      
      // 分割输入的域名（按换行符或逗号）
      const domains = domainsInput
        .split(/[\n,]/)
        .map(d => d.trim())
        .filter(d => d.length > 0)
      
      // 简单的域名验证
      const results = domains.map(domain => {
        // 域名基本验证规则
        const isValidFormat = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)
        
        if (!isValidFormat) {
          return {
            domain,
            isValid: false,
            message: "域名格式不正确"
          }
        }
        
        return {
          domain,
          isValid: true
        }
      })
      
      setValidationResults(results)
      setIsValidating(false)
    }
    
    // 使用防抖，避免频繁验证
    const timeoutId = setTimeout(validateDomains, 500)
    return () => clearTimeout(timeoutId)
  }, [domainsInput])

  // 计算有效和无效的域名数量
  const validCount = validationResults.filter(r => r.isValid).length
  const invalidCount = validationResults.filter(r => !r.isValid).length

  // 处理提交
  const handleSubmit = async () => {
    if (isSubmitting) return
    
    // 获取有效的域名
    const validDomains = validationResults
      .filter(r => r.isValid)
      .map(r => r.domain)
    
    if (validDomains.length === 0) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onAddDomain(validDomains)
      setDomainsInput("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加域名</DialogTitle>
          <DialogDescription>
            为组织 <span className="font-medium">{organizationName}</span> 添加一个或多个域名。
            每行输入一个域名，或用逗号分隔多个域名。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="domains">域名</Label>
            <Textarea
              id="domains"
              placeholder={`example.com
google.com
github.com`}
              value={domainsInput}
              onChange={(e) => setDomainsInput(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              输入一个或多个域名，每行一个或用逗号分隔
            </p>
          </div>
          
          {/* 验证结果显示 */}
          {isValidating ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              正在验证域名...
            </div>
          ) : validationResults.length > 0 && (
            <div className="space-y-2">
              {validCount > 0 && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {validCount} 个有效域名
                  </AlertDescription>
                </Alert>
              )}
              
              {invalidCount > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600">
                    {invalidCount} 个无效域名，请检查格式
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 显示无效域名的详细信息 */}
              {invalidCount > 0 && (
                <div className="text-sm text-red-600 space-y-1">
                  {validationResults
                    .filter(r => !r.isValid)
                    .map((result, index) => (
                      <div key={index}>
                        <span className="font-medium">{result.domain}</span>: {result.message}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex space-x-2 justify-end">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={validCount === 0 || isSubmitting || isValidating}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "添加中..." : "添加域名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
