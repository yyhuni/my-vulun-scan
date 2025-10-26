/**
 * Mock 数据 - 组织
 */

import type { Organization } from "@/types/organization.types"

export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: "阿里巴巴",
    description: "全球领先的电商平台",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    name: "腾讯",
    description: "互联网综合服务提供商",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-16T00:00:00Z",
  },
  {
    id: 3,
    name: "字节跳动",
    description: "全球化互联网公司",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z",
  },
  {
    id: 4,
    name: "百度",
    description: "领先的人工智能公司",
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z",
  },
  {
    id: 5,
    name: "美团",
    description: "中国领先的生活服务平台",
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-19T00:00:00Z",
  },
]

// 用于生成新 ID
let nextOrgId = 6
export const getNextOrgId = () => nextOrgId++
