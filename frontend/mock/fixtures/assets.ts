/**
 * Mock 数据 - 资产
 */
import type { Asset } from '@/types/asset.types'

export const mockAssets: Asset[] = [
  {
    id: 1,
    name: 'aliyun.com',
    description: '阿里云官网',
    organizationId: 1,
    organizationName: '阿里巴巴集团',
    domainCount: 15,
    endpointCount: 234,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-10-20T15:30:00Z',
  },
  {
    id: 2,
    name: 'taobao.com',
    description: '淘宝网',
    organizationId: 1,
    organizationName: '阿里巴巴集团',
    domainCount: 28,
    endpointCount: 567,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-10-19T14:20:00Z',
  },
  {
    id: 3,
    name: 'tmall.com',
    description: '天猫商城',
    organizationId: 1,
    organizationName: '阿里巴巴集团',
    domainCount: 22,
    endpointCount: 433,
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-10-18T16:45:00Z',
  },
  {
    id: 4,
    name: 'qq.com',
    description: '腾讯QQ',
    organizationId: 2,
    organizationName: '腾讯控股',
    domainCount: 35,
    endpointCount: 678,
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-10-17T12:30:00Z',
  },
  {
    id: 5,
    name: 'weixin.qq.com',
    description: '微信官网',
    organizationId: 2,
    organizationName: '腾讯控股',
    domainCount: 18,
    endpointCount: 456,
    createdAt: '2024-01-21T12:00:00Z',
    updatedAt: '2024-10-16T10:15:00Z',
  },
  {
    id: 6,
    name: 'douyin.com',
    description: '抖音短视频',
    organizationId: 3,
    organizationName: '字节跳动',
    domainCount: 25,
    endpointCount: 567,
    createdAt: '2024-02-01T09:30:00Z',
    updatedAt: '2024-10-15T14:50:00Z',
  },
  {
    id: 7,
    name: 'toutiao.com',
    description: '今日头条',
    organizationId: 3,
    organizationName: '字节跳动',
    domainCount: 20,
    endpointCount: 389,
    createdAt: '2024-02-02T10:30:00Z',
    updatedAt: '2024-10-14T16:30:00Z',
  },
  {
    id: 8,
    name: 'huawei.com',
    description: '华为官网',
    organizationId: 4,
    organizationName: '华为技术',
    domainCount: 42,
    endpointCount: 892,
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-10-13T11:20:00Z',
  },
  {
    id: 9,
    name: 'baidu.com',
    description: '百度搜索',
    organizationId: 5,
    organizationName: '百度公司',
    domainCount: 30,
    endpointCount: 567,
    createdAt: '2024-02-15T11:00:00Z',
    updatedAt: '2024-10-12T09:15:00Z',
  },
  {
    id: 10,
    name: 'meituan.com',
    description: '美团外卖',
    organizationId: 6,
    organizationName: '美团',
    domainCount: 22,
    endpointCount: 445,
    createdAt: '2024-03-01T13:30:00Z',
    updatedAt: '2024-10-11T14:50:00Z',
  },
]

/**
 * 根据ID获取资产
 */
export function getAssetById(id: number): Asset | undefined {
  return mockAssets.find(asset => asset.id === id)
}

/**
 * 根据组织ID获取资产列表
 */
export function getAssetsByOrganizationId(organizationId: number, page = 1, pageSize = 10) {
  const filtered = mockAssets.filter(asset => asset.organizationId === organizationId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    assets: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

/**
 * 获取所有资产（分页）
 */
export function getAllAssets(page = 1, pageSize = 10) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = mockAssets.slice(startIndex, endIndex)
  
  return {
    assets: paginatedData,
    total: mockAssets.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockAssets.length / pageSize),
  }
}

/**
 * 批量创建资产（模拟）
 */
export function createAssets(data: {
  assets: Array<{ name: string; description?: string }>
  organizationId: number
}) {
  const createdAssets: Asset[] = []
  const now = new Date().toISOString()
  
  data.assets.forEach(assetData => {
    const newId = Math.max(...mockAssets.map(a => a.id)) + 1
    const newAsset: Asset = {
      id: newId,
      name: assetData.name,
      description: assetData.description || '',
      organizationId: data.organizationId,
      organizationName: '组织名称', // 实际应该从组织数据中获取
      domainCount: 0,
      endpointCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    mockAssets.unshift(newAsset)
    createdAssets.push(newAsset)
  })
  
  return {
    message: `成功创建 ${createdAssets.length} 个资产`,
    createdCount: createdAssets.length,
    assets: createdAssets,
  }
}

/**
 * 更新资产（模拟）
 */
export function updateAsset(id: number, data: { name?: string; description?: string }): Asset | null {
  const index = mockAssets.findIndex(asset => asset.id === id)
  if (index === -1) return null
  
  mockAssets[index] = {
    ...mockAssets[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  
  return mockAssets[index]
}

/**
 * 删除资产（模拟）
 */
export function deleteAsset(id: number): boolean {
  const index = mockAssets.findIndex(asset => asset.id === id)
  if (index === -1) return false
  
  mockAssets.splice(index, 1)
  return true
}

/**
 * 批量删除资产（模拟）
 */
export function batchDeleteAssets(ids: number[]) {
  let deletedCount = 0
  ids.forEach(id => {
    if (deleteAsset(id)) {
      deletedCount++
    }
  })
  
  return {
    message: `成功删除 ${deletedCount} 个资产`,
    deletedAssetCount: deletedCount,
    deletedDomainCount: deletedCount * 5, // 模拟关联删除的域名
  }
}

