"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCreateEholeFingerprint,
  useUpdateEholeFingerprint,
} from "@/hooks/use-fingerprints"
import type { EholeFingerprint } from "@/types/fingerprint.types"

interface EholeFingerprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fingerprint?: EholeFingerprint | null  // 编辑时传入
  onSuccess?: () => void
}

interface FormData {
  cms: string
  method: string
  location: string
  keyword: string  // 逗号分隔的字符串
  type: string
  isImportant: boolean
}

const METHOD_OPTIONS = [
  { value: "keyword", label: "keyword" },
  { value: "faviconhash", label: "faviconhash" },
  { value: "icon_hash", label: "icon_hash" },
  { value: "header", label: "header" },
]

const LOCATION_OPTIONS = [
  { value: "body", label: "body" },
  { value: "header", label: "header" },
  { value: "title", label: "title" },
]

export function EholeFingerprintDialog({
  open,
  onOpenChange,
  fingerprint,
  onSuccess,
}: EholeFingerprintDialogProps) {
  const isEdit = !!fingerprint

  const createMutation = useCreateEholeFingerprint()
  const updateMutation = useUpdateEholeFingerprint()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      cms: "",
      method: "keyword",
      location: "body",
      keyword: "",
      type: "-",
      isImportant: false,
    },
  })

  // 编辑时填充表单
  useEffect(() => {
    if (fingerprint) {
      reset({
        cms: fingerprint.cms,
        method: fingerprint.method,
        location: fingerprint.location,
        keyword: fingerprint.keyword.join(", "),
        type: fingerprint.type || "-",
        isImportant: fingerprint.isImportant,
      })
    } else {
      reset({
        cms: "",
        method: "keyword",
        location: "body",
        keyword: "",
        type: "-",
        isImportant: false,
      })
    }
  }, [fingerprint, reset])

  const onSubmit = async (data: FormData) => {
    // 解析 keyword 字符串为数组
    const keywordArray = data.keyword
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    if (keywordArray.length === 0) {
      toast.error("关键词不能为空")
      return
    }

    const payload = {
      cms: data.cms.trim(),
      method: data.method,
      location: data.location,
      keyword: keywordArray,
      type: data.type || "-",
      isImportant: data.isImportant,
    }

    try {
      if (isEdit && fingerprint) {
        await updateMutation.mutateAsync({ id: fingerprint.id, data: payload })
        toast.success("更新成功")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("创建成功")
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || (isEdit ? "更新失败" : "创建失败"))
    }
  }

  const method = watch("method")
  const location = watch("location")
  const isImportant = watch("isImportant")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑指纹" : "添加指纹"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改 EHole 指纹规则" : "添加新的 EHole 指纹规则"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CMS 名称 */}
          <div className="space-y-2">
            <Label htmlFor="cms">CMS 名称 *</Label>
            <Input
              id="cms"
              placeholder="如：WordPress、Nginx"
              {...register("cms", { required: "CMS 名称不能为空" })}
            />
            {errors.cms && (
              <p className="text-sm text-destructive">{errors.cms.message}</p>
            )}
          </div>

          {/* 匹配方式 & 匹配位置 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>匹配方式</Label>
              <Select value={method} onValueChange={(v) => setValue("method", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>匹配位置</Label>
              <Select value={location} onValueChange={(v) => setValue("location", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 关键词 */}
          <div className="space-y-2">
            <Label htmlFor="keyword">关键词 *</Label>
            <Input
              id="keyword"
              placeholder="多个关键词用逗号分隔，如：wp-content, wp-includes"
              {...register("keyword", { required: "关键词不能为空" })}
            />
            {errors.keyword && (
              <p className="text-sm text-destructive">{errors.keyword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              多个关键词用逗号分隔，匹配时为 AND 关系
            </p>
          </div>

          {/* 类型 */}
          <div className="space-y-2">
            <Label htmlFor="type">类型</Label>
            <Input
              id="type"
              placeholder="如：CMS、Server、Framework"
              {...register("type")}
            />
          </div>

          {/* 重点资产 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isImportant"
              checked={isImportant}
              onCheckedChange={(checked) => setValue("isImportant", !!checked)}
            />
            <Label htmlFor="isImportant" className="cursor-pointer">
              标记为重点资产
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : isEdit ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
