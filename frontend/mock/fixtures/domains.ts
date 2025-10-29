/**
 * Mock 数据 - 域名
 */
import type { Subdomain } from '@/types/subdomain.types'

export const mockDomains: Subdomain[] = [
  {
    id: 1,
    name: 'www.aliyun.com',
    description: '阿里云主站',
    assetId: 1,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-10-20T15:30:00Z',
    status: '200',
    title: 'Alibaba Cloud - The Leading Cloud Computing Service Provider',
    ip: '47.246.23.156',
    ports: [80, 443, 8080],
    contentLength: 52340,
    screenshot: 'https://via.placeholder.com/1200x800/4A90E2/FFFFFF?text=Aliyun+Screenshot',
    responseTime: 234,
    isImportant: true,
  },
  {
    id: 2,
    name: 'api.aliyun.com',
    description: '阿里云API',
    assetId: 1,
    createdAt: '2024-01-15T08:05:00Z',
    updatedAt: '2024-10-20T14:20:00Z',
    status: '200',
    title: 'Alibaba Cloud API Gateway',
    ip: '47.246.23.157',
    ports: [443, 8443],
    contentLength: 12456,
    screenshot: 'https://via.placeholder.com/1200x800/50C878/FFFFFF?text=API+Gateway',
    responseTime: 156,
    isImportant: true,
  },
  {
    id: 3,
    name: 'console.aliyun.com',
    description: '阿里云控制台',
    assetId: 1,
    createdAt: '2024-01-15T08:10:00Z',
    updatedAt: '2024-10-19T16:45:00Z',
    status: '200',
    title: 'Alibaba Cloud Console',
    ip: '47.246.23.158',
    ports: [443],
    contentLength: 89234,
    screenshot: 'https://via.placeholder.com/1200x800/FF6B6B/FFFFFF?text=Console',
    responseTime: 189,
    isImportant: false,
  },
  {
    id: 4,
    name: 'www.taobao.com',
    description: '淘宝主站',
    assetId: 2,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-10-18T12:30:00Z',
    status: '200',
    title: '淘宝网 - 淘！我喜欢',
    ip: '106.11.248.123',
    ports: [80, 443],
    contentLength: 145678,
    screenshot: 'https://via.placeholder.com/1200x800/FF4500/FFFFFF?text=Taobao',
    responseTime: 98,
    isImportant: true,
  },
  {
    id: 5,
    name: 'login.taobao.com',
    description: '淘宝登录',
    assetId: 2,
    createdAt: '2024-01-16T09:05:00Z',
    updatedAt: '2024-10-17T10:15:00Z',
    status: '200',
    title: '淘宝网 - 登录',
    ip: '106.11.248.124',
    ports: [443],
    contentLength: 34567,
    screenshot: 'https://via.placeholder.com/1200x800/FFB84D/FFFFFF?text=Taobao+Login',
    responseTime: 112,
    isImportant: true,
  },
  {
    id: 6,
    name: 'www.qq.com',
    description: 'QQ主站',
    assetId: 4,
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-10-16T14:50:00Z',
    status: '200',
    title: '腾讯首页',
    ip: '183.3.226.35',
    ports: [80, 443],
    contentLength: 78234,
    screenshot: 'https://via.placeholder.com/1200x800/12B7F5/FFFFFF?text=QQ',
    responseTime: 145,
    isImportant: false,
  },
  {
    id: 7,
    name: 'www.douyin.com',
    description: '抖音主站',
    assetId: 6,
    createdAt: '2024-02-01T09:30:00Z',
    updatedAt: '2024-10-15T16:30:00Z',
    status: '200',
    title: '抖音 - 记录美好生活',
    ip: '220.181.38.251',
    ports: [80, 443],
    contentLength: 234567,
    screenshot: 'https://via.placeholder.com/1200x800/000000/FFFFFF?text=Douyin',
    responseTime: 201,
    isImportant: false,
  },
  {
    id: 8,
    name: 'developer.aliyun.com',
    description: '阿里云开发者平台',
    assetId: 1,
    createdAt: '2024-01-15T08:15:00Z',
    updatedAt: '2024-10-14T11:20:00Z',
    status: '200',
    title: 'Alibaba Cloud Developer Portal',
    ip: '47.246.23.159',
    ports: [443, 8080],
    contentLength: 67890,
    screenshot: 'https://via.placeholder.com/1200x800/9B59B6/FFFFFF?text=Developer',
    responseTime: 178,
    isImportant: false,
  },
  {
    id: 9,
    name: 'oss.aliyun.com',
    description: '阿里云对象存储',
    assetId: 1,
    createdAt: '2024-01-15T08:20:00Z',
    updatedAt: '2024-10-13T09:15:00Z',
    status: '403',
    title: 'Access Denied',
    ip: '47.246.23.160',
    ports: [443],
    contentLength: 1234,
    responseTime: 89,
    isImportant: false,
  },
  {
    id: 10,
    name: 'pay.taobao.com',
    description: '淘宝支付',
    assetId: 2,
    createdAt: '2024-01-16T09:10:00Z',
    updatedAt: '2024-10-12T14:30:00Z',
    status: '200',
    title: '支付宝 - 支付页面',
    ip: '106.11.248.125',
    ports: [443],
    contentLength: 45678,
    screenshot: 'https://via.placeholder.com/1200x800/00A0E9/FFFFFF?text=Alipay',
    responseTime: 134,
    isImportant: true,
  },
]

/**
 * 根据ID获取域名
 */
export function getDomainById(id: number): Subdomain | undefined {
  return mockDomains.find(domain => domain.id === id)
}

/**
 * 根据资产ID获取域名列表
 */
export function getDomainsByAssetId(assetId: number, page = 1, pageSize = 10) {
  const filtered = mockDomains.filter(domain => domain.assetId === assetId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    domains: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

/**
 * 根据组织ID获取域名列表
 * 注意：在 mock 数据中，我们假设 assetId 就是 organizationId
 */
export function getDomainsByOrganizationId(organizationId: number, page = 1, pageSize = 10) {
  const filtered = mockDomains.filter(domain => domain.assetId === organizationId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    domains: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

