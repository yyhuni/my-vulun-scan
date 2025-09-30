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
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"


export default function AddOrganizationDialog({ onAdd }: any) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // 使用组织服务
      const response = await OrganizationService.createOrganization({
        name: formData.name,
        description: formData.description,
      })
      console.log('Backend response:', response)

      if (response.code === "200" && response.data) {
        onAdd() // 组织创建成功，通知父组件刷新列表
      } else {
        console.error("创建组织失败:", response.message || "创建组织失败，请重试。")
      }
    } catch (error: any) {
      console.error("创建组织失败:", getErrorMessage(error))
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
            <span>添加新组织</span>
          </DialogTitle>
          <DialogDescription>填写组织信息以添加到系统中。标有 * 的字段为必填项。</DialogDescription>
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
            <Button type="submit">添加组织</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
