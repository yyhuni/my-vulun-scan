"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

export function useBulkDeleteIPAddresses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ipIds: number[]) => IPAddressService.bulkDeleteIPAddresses(ipIds),
    onSuccess: () => {
      // 刷新所有 IP 地址相关的查询
      queryClient.invalidateQueries({ queryKey: ipAddressKeys.all })
    },
  })
}
