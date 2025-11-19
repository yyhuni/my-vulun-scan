"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { IPAddressService } from "@/services/ip-address.service"
import type { GetIPAddressesParams, GetIPAddressesResponse } from "@/types/ip-address.types"

const ipAddressKeys = {
  all: ["ip-addresses"] as const,
  target: (targetId: number, params: GetIPAddressesParams) =>
    [...ipAddressKeys.all, "target", targetId, params] as const,
  scan: (scanId: number, params: GetIPAddressesParams) =>
    [...ipAddressKeys.all, "scan", scanId, params] as const,
}

function normalizeParams(params?: GetIPAddressesParams): Required<GetIPAddressesParams> {
  return {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 10,
  }
}

export function useTargetIPAddresses(
  targetId: number,
  params?: GetIPAddressesParams,
  options?: { enabled?: boolean }
) {
  const normalizedParams = normalizeParams(params)

  return useQuery({
    queryKey: ipAddressKeys.target(targetId, normalizedParams),
    queryFn: () => IPAddressService.getTargetIPAddresses(targetId, normalizedParams),
    enabled: options?.enabled ?? !!targetId,
    select: (response: GetIPAddressesResponse) => response,
  })
}

export function useScanIPAddresses(
  scanId: number,
  params?: GetIPAddressesParams,
  options?: { enabled?: boolean }
) {
  const normalizedParams = normalizeParams(params)

  return useQuery({
    queryKey: ipAddressKeys.scan(scanId, normalizedParams),
    queryFn: () => IPAddressService.getScanIPAddresses(scanId, normalizedParams),
    enabled: options?.enabled ?? !!scanId,
    select: (response: GetIPAddressesResponse) => response,
  })
}

// 删除单个 IP 地址（使用单独的 DELETE API）
export function useDeleteIPAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ipId: number) => IPAddressService.deleteIPAddress(ipId),
    onMutate: (id) => {
      toast.loading('正在删除 IP 地址...', { id: `delete-ip-${id}` })
    },
    onSuccess: (response, id) => {
      toast.dismiss(`delete-ip-${id}`)
      
      // 显示删除信息（单个删除 API 返回两阶段信息）
      const { ipAddress, detail } = response
      toast.success(`IP 地址 "${ipAddress}" 已成功删除`, {
        description: `${detail.phase1}；${detail.phase2}`,
        duration: 4000
      })
      
      // 刷新所有 IP 地址相关的查询
      queryClient.invalidateQueries({ queryKey: ipAddressKeys.all })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
    onError: (error: Error, id) => {
      toast.dismiss(`delete-ip-${id}`)
      toast.error('删除 IP 地址失败')
    },
  })
}

// 批量删除 IP 地址（使用统一的批量删除接口）
export function useBulkDeleteIPAddresses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => IPAddressService.bulkDeleteIPAddresses(ids),
    onMutate: () => {
      toast.loading('正在批量删除 IP 地址...', { id: 'bulk-delete-ips' })
    },
    onSuccess: (response) => {
      toast.dismiss('bulk-delete-ips')
      
      // 显示级联删除信息
      const cascadeInfo = Object.entries(response.cascadeDeleted || {})
        .filter(([key, count]) => key !== 'asset.IPAddress' && count > 0)
        .map(([key, count]) => {
          const modelName = key.split('.')[1]
          return `${modelName}: ${count}`
        })
        .join(', ')
      
      if (cascadeInfo) {
        toast.success(`成功删除 ${response.deletedCount} 个 IP 地址（级联删除: ${cascadeInfo}）`)
      } else {
        toast.success(`成功删除 ${response.deletedCount} 个 IP 地址`)
      }
      
      // 刷新所有 IP 地址相关的查询
      queryClient.invalidateQueries({ queryKey: ipAddressKeys.all })
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
    onError: (error: Error) => {
      toast.dismiss('bulk-delete-ips')
      toast.error('批量删除 IP 地址失败')
    },
  })
}
