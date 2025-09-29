"use client"

// React 核心库
import { useState } from "react"
import type React from "react"

// UI 图标库
import { Plus, Building2 } from "lucide-react"

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
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// 类型定义
interface Organization {
  id: string
  name: string
  description: string
  CreatedAt: string
}

interface AddOrganizationDialogProps {
  onAdd: (organization: Organization) => void
  organization?: Organization | null  // 编辑模式下传入的组织数据
  onEdit?: (organization: Organization) => void  // 编辑模式下的回调
}

export default function AddOrganizationDialog({
  onAdd,
  organization,
  onEdit
}: AddOrganizationDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  const isEditMode = !!organization
  const dialogTitle = isEditMode ? "编辑组织" : "添加新组织"
  const submitButtonText = isEditMode ? "更新组织" : "添加组织"

  // 当组织数据变化时更新表单
  React.useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        description: organization.description || "",
      })
    } else {
      setFormData({
        name: "",
        description: "",
      })
    }
  }, [organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "错误",
        description: "请输入组织名称",
        variant: "destructive",
      })
      return
    }

    try {
      if (isEditMode && organization) {
        // 编辑模式
        const response = await OrganizationService.updateOrganization({
          id: organization.id,
          name: formData.name,
          description: formData.description,
        })

        if (response.code === "SUCCESS" && response.data) {
          onEdit?.(response.data)
          toast({
            title: "更新成功",
            description: `组织 "${formData.name}" 已成功更新`,
          })
        } else {
          throw new Error(response.message || "更新组织失败")
        }
      } else {
        // 添加模式
        const response = await OrganizationService.createOrganization({
          name: formData.name,
          description: formData.description,
        })

        if (response.code === "SUCCESS" && response.data) {
          onAdd(response.data)
          toast({
            title: "添加成功",
            description: `组织 "${formData.name}" 已成功添加`,
          })
        } else {
          throw new Error(response.message || "创建组织失败")
        }
      }
    } catch (error: any) {
      toast({
        title: "错误",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setFormData({
        name: "",
        description: "",
      })
      setOpen(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          添加组织
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>{dialogTitle}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "修改组织的基本信息。标有 * 的字段为必填项。"
              : "填写组织信息以添加到系统中。标有 * 的字段为必填项。"
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">组织名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入组织名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">组织描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入组织描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit">{submitButtonText}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
