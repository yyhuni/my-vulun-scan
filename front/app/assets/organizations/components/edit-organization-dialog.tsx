"use client"

// React 核心库
import { useState, useEffect } from "react"
import type React from "react"

// UI 图标库
import { Edit, Building2 } from "lucide-react"

// UI 组件库
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// 自定义 Hooks 和 API 客户端
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"
import type { Organization } from "@/types/organization.types"

interface EditOrganizationDialogProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (organization: Organization) => void
}

export default function EditOrganizationDialog({ organization, open, onOpenChange, onEdit }: EditOrganizationDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 当organization prop变化时，更新表单数据
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description,
      })
    }
  }, [organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // 使用组织服务更新
      const response = await OrganizationService.updateOrganization({
        id: organization.id,
        name: formData.name,
        description: formData.description,
      })
      console.log('Backend response:', response)

      if (response.code === "200" && response.data) {
        onEdit?.(response.data) // 组织更新成功，通知父组件刷新列表
      } else {
        console.error("更新组织失败:", response.message || "更新组织失败，请重试。")
      }
    } catch (error: any) {
      console.error("更新组织失败:", getErrorMessage(error))
    } finally {
      onOpenChange(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>编辑组织</span>
          </DialogTitle>
          <DialogDescription>修改组织信息。标有 * 的字段为必填项。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">组织名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入组织名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">组织描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入组织描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">更新组织</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
