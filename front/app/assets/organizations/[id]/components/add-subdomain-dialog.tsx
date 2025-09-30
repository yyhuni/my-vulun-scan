"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Loader2, Globe } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

import type { MainDomain } from "@/types/domain.types"

interface AddSubDomainDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationName: string
  mainDomains: MainDomain[]
  onAddSubDomain: (subdomains: { name: string; mainDomainId: string }[]) => void
}

import type { ValidationResult } from "@/types/domain.types"

export function AddSubDomainDialog({
  isOpen,
  onClose,
  organizationName,
  mainDomains,
  onAddSubDomain,
}: AddSubDomainDialogProps) {
  const [subdomainsInput, setSubdomainsInput] = useState("")
  const [selectedMainDomainId, setSelectedMainDomainId] = useState("")
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 重置表单
  const resetForm = () => {
    setSubdomainsInput("")
    setSelectedMainDomainId("")
    setValidationResults([])
  }

  // 当对话框关闭时重置表单
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  // 当输入变化时验证子域名
  useEffect(() => {
    if (!subdomainsInput.trim()) {
      setValidationResults([])
      return
    }

    const validateSubdomains = async () => {
      setIsValidating(true)
      
      // 分割输入的子域名（按换行符或逗号）
      const subdomains = subdomainsInput
        .split(/[\n,]/)
        .map(d => d.trim())
        .filter(d => d.length > 0)
      
      // 子域名验证规则
      const results = subdomains.map(subdomain => {
        // 子域名基本验证规则（允许多级子域名）
        const isValidFormat = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/.test(subdomain)
        
        if (!isValidFormat) {
          return {
            subdomain,
            isValid: false,
            message: "子域名格式不正确"
          }
        }
        
        // 检查是否包含完整域名（不应该包含主域名部分）
        if (subdomain.includes('.') && subdomain.split('.').length > 2) {
          return {
            subdomain,
            isValid: false,
            message: "请只输入子域名部分，不要包含主域名"
          }
        }
        
        return {
          subdomain,
          isValid: true
        }
      })
      
      setValidationResults(results)
      setIsValidating(false)
    }
    
    // 使用防抖，避免频繁验证
    const timeoutId = setTimeout(validateSubdomains, 500)
    return () => clearTimeout(timeoutId)
  }, [subdomainsInput])

  // 计算有效和无效的子域名数量
  const validCount = validationResults.filter(r => r.isValid).length
  const invalidCount = validationResults.filter(r => !r.isValid).length

  // 处理提交
  const handleSubmit = async () => {
    if (isSubmitting) return
    
    // 检查是否选择了主域名
    if (!selectedMainDomainId) {
      return
    }
    
    // 获取有效的子域名
    const validSubdomains = validationResults
      .filter(r => r.isValid)
      .map(r => ({
        name: r.subdomain,
        mainDomainId: selectedMainDomainId
      }))
    
    if (validSubdomains.length === 0) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onAddSubDomain(validSubdomains)
      resetForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMainDomain = mainDomains.find(d => d.id === selectedMainDomainId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            添加子域名
          </DialogTitle>
          <DialogDescription>
            为组织 <span className="font-medium">{organizationName}</span> 添加一个或多个子域名。
            每行输入一个子域名，或用逗号分隔多个子域名。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* 选择主域名 */}
          <div className="space-y-2">
            <Label htmlFor="main-domain">选择主域名</Label>
            <Select value={selectedMainDomainId} onValueChange={setSelectedMainDomainId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择一个主域名" />
              </SelectTrigger>
              <SelectContent>
                {mainDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name || domain.main_domain_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mainDomains.length === 0 && (
              <p className="text-xs text-destructive">
                该组织暂无主域名，请先添加主域名
              </p>
            )}
          </div>
          
          {/* 输入子域名 */}
          <div className="space-y-2">
            <Label htmlFor="subdomains">子域名</Label>
            <Textarea
              id="subdomains"
              placeholder={`www
api
admin
mail`}
              value={subdomainsInput}
              onChange={(e) => setSubdomainsInput(e.target.value)}
              rows={5}
              className="resize-none"
              disabled={!selectedMainDomainId}
            />
            <p className="text-xs text-muted-foreground">
              {selectedMainDomain
                ? `输入子域名前缀，将自动添加到 ${selectedMainDomain.name || selectedMainDomain.main_domain_name}`
                : "请先选择主域名"
              }
            </p>
          </div>
          
          {/* 验证结果显示 */}
          {isValidating ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              正在验证子域名...
            </div>
          ) : validationResults.length > 0 && (
            <div className="space-y-2">
              {validCount > 0 && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {validCount} 个有效子域名
                    {selectedMainDomain && (
                      <div className="mt-1 text-xs">
                        将添加到: {selectedMainDomain.name || selectedMainDomain.main_domain_name}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {invalidCount > 0 && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600">
                    {invalidCount} 个无效子域名，请检查格式
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 显示无效子域名的详细信息 */}
              {invalidCount > 0 && (
                <div className="text-sm text-red-600 space-y-1">
                  {validationResults
                    .filter(r => !r.isValid)
                    .map((result, index) => (
                      <div key={index}>
                        <span className="font-medium">{result.subdomain}</span>: {result.message}
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
            disabled={validCount === 0 || isSubmitting || isValidating || !selectedMainDomainId}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "添加中..." : "添加子域名"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
