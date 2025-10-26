/**
 * Mock 数据 - 子域名
 */

import type { Domain } from "@/types/domain.types"

export const mockDomains: Domain[] = [
  {
    id: 1,
    name: "www.taobao.com",
    description: "淘宝WWW",
    assetId: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    name: "m.taobao.com",
    description: "淘宝移动端",
    assetId: 1,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-16T00:00:00Z",
  },
  {
    id: 3,
    name: "login.taobao.com",
    description: "淘宝登录",
    assetId: 1,
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z",
  },
  {
    id: 4,
    name: "www.tmall.com",
    description: "天猫WWW",
    assetId: 2,
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z",
  },
  {
    id: 5,
    name: "m.tmall.com",
    description: "天猫移动端",
    assetId: 2,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-19T00:00:00Z",
  },
]

let nextDomainId = 6
export const getNextDomainId = () => nextDomainId++
