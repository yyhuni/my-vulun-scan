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
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateWappalyzerFingerprint,
  useUpdateWappalyzerFingerprint,
} from "@/hooks/use-fingerprints"
import type { WappalyzerFingerprint } from "@/types/fingerprint.types"

interface WappalyzerFingerprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fingerprint?: WappalyzerFingerprint | null
  onSuccess?: () => void
}

interface FormData {
  name: string
  cats: string
  description: string
  website: string
  cpe: string
  cookies: string
  headers: string
  scriptSrc: string
  js: string
  meta: string
  html: string
  implies: string
}

export function WappalyzerFingerprintDialog({
  open,
  onOpenChange,
  fingerprint,
  onSuccess,
}: WappalyzerFingerprintDialogProps) {
  const isEdit = !!fingerprint

  const createMutation = useCreateWappalyzerFingerprint()
  const updateMutation = useUpdateWappalyzerFingerprint()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      cats: "",
      description: "",
      website: "",
      cpe: "",
      cookies: "{}",
      headers: "{}",
      scriptSrc: "",
      js: "",
      meta: "{}",
      html: "",
      implies: "",
    },
  })

  useEffect(() => {
    if (fingerprint) {
      reset({
        name: fingerprint.name,
        cats: fingerprint.cats?.join(", ") || "",
        description: fingerprint.description || "",
        website: fingerprint.website || "",
        cpe: fingerprint.cpe || "",
        cookies: JSON.stringify(fingerprint.cookies || {}, null, 2),
        headers: JSON.stringify(fingerprint.headers || {}, null, 2),
        scriptSrc: fingerprint.scriptSrc?.join(", ") || "",
        js: fingerprint.js?.join(", ") || "",
        meta: JSON.stringify(fingerprint.meta || {}, null, 2),
        html: fingerprint.html?.join(", ") || "",
        implies: fingerprint.implies?.join(", ") || "",
      })
    } else {
      reset({
        name: "",
        cats: "",
        description: "",
        website: "",
        cpe: "",
        cookies: "{}",
        headers: "{}",
        scriptSrc: "",
        js: "",
        meta: "{}",
        html: "",
        implies: "",
      })
    }
  }, [fingerprint, reset])

  const parseArray = (str: string): string[] => {
    return str.split(",").map(s => s.trim()).filter(s => s.length > 0)
  }

  const parseNumberArray = (str: string): number[] => {
    return str.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
  }

  const parseJson = (str: string): Record<string, any> => {
    try {
      return JSON.parse(str)
    } catch {
      return {}
    }
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name.trim(),
      cats: parseNumberArray(data.cats),
      description: data.description.trim(),
      website: data.website.trim(),
      cpe: data.cpe.trim(),
      cookies: parseJson(data.cookies),
      headers: parseJson(data.headers),
      scriptSrc: parseArray(data.scriptSrc),
      js: parseArray(data.js),
      meta: parseJson(data.meta),
      html: parseArray(data.html),
      implies: parseArray(data.implies),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑 Wappalyzer 指纹" : "添加 Wappalyzer 指纹"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改指纹规则配置" : "添加新的指纹规则"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">应用名称 *</Label>
              <Input
                id="name"
                placeholder="如：WordPress、React"
                {...register("name", { required: "应用名称不能为空" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cats">分类 ID</Label>
              <Input
                id="cats"
                placeholder="如：1, 6, 12"
                {...register("cats")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">官网</Label>
              <Input
                id="website"
                placeholder="https://example.com"
                {...register("website")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpe">CPE</Label>
              <Input
                id="cpe"
                placeholder="cpe:/a:vendor:product"
                {...register("cpe")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="应用描述"
              rows={2}
              {...register("description")}
            />
          </div>

          {/* 检测规则 */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">检测规则</Label>
            <p className="text-xs text-muted-foreground">JSON 格式使用对象，数组格式用逗号分隔</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cookies">Cookies (JSON)</Label>
              <Textarea
                id="cookies"
                placeholder='{"name": "pattern"}'
                rows={2}
                className="font-mono text-xs"
                {...register("cookies")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                placeholder='{"X-Powered-By": "pattern"}'
                rows={2}
                className="font-mono text-xs"
                {...register("headers")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scriptSrc">Script URL</Label>
              <Input
                id="scriptSrc"
                placeholder="pattern1, pattern2"
                className="font-mono text-xs"
                {...register("scriptSrc")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="js">JS 变量</Label>
              <Input
                id="js"
                placeholder="window.var1, window.var2"
                className="font-mono text-xs"
                {...register("js")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta">Meta 标签 (JSON)</Label>
            <Textarea
              id="meta"
              placeholder='{"generator": ["pattern"]}'
              rows={2}
              className="font-mono text-xs"
              {...register("meta")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="html">HTML 内容</Label>
              <Input
                id="html"
                placeholder="pattern1, pattern2"
                className="font-mono text-xs"
                {...register("html")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="implies">依赖</Label>
              <Input
                id="implies"
                placeholder="PHP, MySQL"
                {...register("implies")}
              />
            </div>
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
