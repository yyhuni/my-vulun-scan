"use client"

import React, { useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { toast } from "sonner"
import { IconPlus, IconTrash } from "@tabler/icons-react"
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
  useCreateGobyFingerprint,
  useUpdateGobyFingerprint,
} from "@/hooks/use-fingerprints"
import type { GobyFingerprint, GobyRule } from "@/types/fingerprint.types"

interface GobyFingerprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fingerprint?: GobyFingerprint | null
  onSuccess?: () => void
}

interface FormData {
  name: string
  logic: string
  rule: GobyRule[]
}

const LABEL_OPTIONS = [
  { value: "title", label: "title" },
  { value: "header", label: "header" },
  { value: "body", label: "body" },
  { value: "server", label: "server" },
  { value: "banner", label: "banner" },
  { value: "port", label: "port" },
  { value: "protocol", label: "protocol" },
  { value: "cert", label: "cert" },
]

export function GobyFingerprintDialog({
  open,
  onOpenChange,
  fingerprint,
  onSuccess,
}: GobyFingerprintDialogProps) {
  const isEdit = !!fingerprint

  const createMutation = useCreateGobyFingerprint()
  const updateMutation = useUpdateGobyFingerprint()

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      logic: "a",
      rule: [{ label: "title", feature: "", isEqual: true }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rule",
  })

  useEffect(() => {
    if (fingerprint) {
      reset({
        name: fingerprint.name,
        logic: fingerprint.logic,
        rule: fingerprint.rule.length > 0 
          ? fingerprint.rule 
          : [{ label: "title", feature: "", isEqual: true }],
      })
    } else {
      reset({
        name: "",
        logic: "a",
        rule: [{ label: "title", feature: "", isEqual: true }],
      })
    }
  }, [fingerprint, reset])

  const onSubmit = async (data: FormData) => {
    if (data.rule.length === 0) {
      toast.error("至少需要一条规则")
      return
    }

    const payload = {
      name: data.name.trim(),
      logic: data.logic.trim(),
      rule: data.rule,
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

  const addRule = () => {
    const nextLabel = String.fromCharCode(97 + fields.length)
    append({ label: "title", feature: "", isEqual: true })
  }

  const watchedRules = watch("rule")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑 Goby 指纹" : "添加 Goby 指纹"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改指纹规则配置" : "添加新的指纹规则"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 产品名称 & 逻辑表达式 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">产品名称 *</Label>
              <Input
                id="name"
                placeholder="如：Apache、Nginx"
                {...register("name", { required: "产品名称不能为空" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logic">逻辑表达式 *</Label>
              <Input
                id="logic"
                placeholder="如：a||b、(a&&b)||c"
                {...register("logic", { required: "逻辑表达式不能为空" })}
              />
              {errors.logic && (
                <p className="text-sm text-destructive">{errors.logic.message}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            逻辑表达式：&& 表示 AND，|| 表示 OR，支持括号分组
          </p>

          {/* 规则列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>规则列表 *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRule}>
                <IconPlus className="h-4 w-4" />
                添加规则
              </Button>
            </div>
            
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <div className="w-24">
                    <Select 
                      value={watchedRules[index]?.label || "title"} 
                      onValueChange={(v) => setValue(`rule.${index}.label`, v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      {...register(`rule.${index}.feature` as const, { required: true })}
                      placeholder="匹配特征"
                      className="h-8"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={watchedRules[index]?.isEqual ?? true}
                      onCheckedChange={(checked) => setValue(`rule.${index}.isEqual`, !!checked)}
                    />
                    <span className="text-xs text-muted-foreground">匹配</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <IconTrash className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
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
