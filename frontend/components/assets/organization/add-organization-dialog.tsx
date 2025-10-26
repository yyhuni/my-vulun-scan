"use client"

import React, { useState } from "react"
import { Plus, Building2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// 导入 UI 组件
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
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// 导入 React Query Hook
import { useCreateOrganization } from "@/hooks/use-organizations"

// 导入类型定义
import type { Organization } from "@/types/organization.types"

// 表单验证 Schema
const formSchema = z.object({
  name: z.string()
    .min(2, { message: "组织名称至少需要 2 个字符" })
    .max(50, { message: "组织名称不能超过 50 个字符" }),
  description: z.string().max(200, { message: "描述不能超过 200 个字符" }).optional(),
})

type FormValues = z.infer<typeof formSchema>

// 组件属性类型定义
interface AddOrganizationDialogProps {
  onAdd?: (organization: Organization) => void  // 添加成功回调函数（可选）
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加组织对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 自动管理提交状态
 * 2. 自动错误处理和成功提示
 * 3. 自动刷新相关数据
 * 4. 更好的用户体验
 */
export function AddOrganizationDialog({ 
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddOrganizationDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  // 使用 React Query 的创建组织 mutation
  const createOrganization = useCreateOrganization()
  
  // 初始化表单
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  // 处理表单提交
  const onSubmit = (values: FormValues) => {
    createOrganization.mutate(
      {
        name: values.name.trim(),
        description: values.description?.trim() || "",
      },
      {
        onSuccess: (newOrganization) => {
          // 重置表单
          form.reset()
          
          // 关闭对话框
          setOpen(false)
          
          // 调用外部回调（如果提供）
          if (onAdd) {
            onAdd(newOrganization)
          }
        }
      }
    )
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createOrganization.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        form.reset()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            添加组织
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 />
            <span>添加新组织</span>
          </DialogTitle>
          <DialogDescription>
            填写组织信息以添加到系统中。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              {/* 组织名称输入框 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      组织名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="请输入组织名称"
                        disabled={createOrganization.isPending}
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/50 字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* 组织描述输入框 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>组织描述</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="请输入组织描述（可选）"
                        disabled={createOrganization.isPending}
                        rows={3}
                        maxLength={200}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {(field.value || "").length}/200 字符
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* 对话框底部按钮 */}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={createOrganization.isPending}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                disabled={createOrganization.isPending || !form.formState.isValid}
              >
                {createOrganization.isPending ? (
                  <>
                    <LoadingSpinner/>
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus />
                    创建组织
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
