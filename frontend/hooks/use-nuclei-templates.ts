"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getNucleiTemplateTree, getNucleiTemplateContent, refreshNucleiTemplates, uploadNucleiTemplate } from "@/services/nuclei.service"
import type { NucleiTemplateTreeNode, NucleiTemplateContent, UploadNucleiTemplatePayload } from "@/types/nuclei.types"

export function useNucleiTemplateTree() {
  return useQuery<NucleiTemplateTreeNode[]>({
    queryKey: ["nuclei", "templates", "tree"],
    queryFn: () => getNucleiTemplateTree(),
  })
}

export function useNucleiTemplateContent(path: string | null) {
  return useQuery<NucleiTemplateContent>({
    queryKey: ["nuclei", "templates", "content", path],
    queryFn: () => getNucleiTemplateContent(path as string),
    enabled: !!path,
  })
}

export function useRefreshNucleiTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => refreshNucleiTemplates(),
    onMutate: () => {
      toast.loading("正在更新 Nuclei 官方模板...", { id: "refresh-nuclei-templates" })
    },
    onSuccess: () => {
      toast.dismiss("refresh-nuclei-templates")
      toast.success("模板更新完成（模拟数据）")
      queryClient.invalidateQueries({ queryKey: ["nuclei", "templates", "tree"] })
    },
    onError: () => {
      toast.dismiss("refresh-nuclei-templates")
      toast.error("模板更新失败")
    },
  })
}

export function useUploadNucleiTemplate() {
  return useMutation<void, Error, UploadNucleiTemplatePayload>({
    mutationFn: (payload) => uploadNucleiTemplate(payload),
    onMutate: () => {
      toast.loading("正在上传模板...", { id: "upload-nuclei-template" })
    },
    onSuccess: () => {
      toast.dismiss("upload-nuclei-template")
      toast.success("模板上传成功（模拟数据）")
    },
    onError: (error) => {
      toast.dismiss("upload-nuclei-template")
      toast.error(error.message || "模板上传失败")
    },
  })
}
