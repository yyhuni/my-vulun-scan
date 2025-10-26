/**
 * Mock 数据 - 资产
 */

import type { Asset } from "@/types/asset.types"

export const mockAssets: Asset[] = [
  {
    id: 1,
    name: "taobao.com",
    description: "淘宝主域名",
    organizationId: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    name: "tmall.com",
    description: "天猫主域名",
    organizationId: 1,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-16T00:00:00Z",
  },
  {
    id: 3,
    name: "qq.com",
    description: "QQ主域名",
    organizationId: 2,
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z",
  },
  {
    id: 4,
    name: "wechat.com",
    description: "微信主域名",
    organizationId: 2,
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z",
  },
  {
    id: 5,
    name: "toutiao.com",
    description: "今日头条主域名",
    organizationId: 3,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-19T00:00:00Z",
  },
  {
    id: 6,
    name: "douyin.com",
    description: "抖音主域名",
    organizationId: 3,
    createdAt: "2024-01-06T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
  },
  {
    id: 7,
    name: "baidu.com",
    description: "百度主域名",
    organizationId: 4,
    createdAt: "2024-01-07T00:00:00Z",
    updatedAt: "2024-01-21T00:00:00Z",
  },
  {
    id: 8,
    name: "meituan.com",
    description: "美团主域名",
    organizationId: 5,
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-22T00:00:00Z",
  },
]

let nextAssetId = 9
export const getNextAssetId = () => nextAssetId++
