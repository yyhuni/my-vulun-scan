/**
 * Mock 数据 - 通知
 */
import type { Notification } from '@/types/notification.types'

export const mockNotifications: Notification[] = [
  {
    id: 1,
    title: '扫描任务完成',
    description: '针对 aliyun.com 的扫描任务已完成，发现 12 个子域名',
    type: 'scan',
    unread: true,
    time: '2024-10-20T15:30:00Z',
  },
  {
    id: 2,
    title: '发现高危漏洞',
    description: '在 api.aliyun.com 发现 SQL 注入漏洞（严重级别）',
    type: 'vulnerability',
    unread: true,
    time: '2024-10-20T14:20:00Z',
    severity: 'high',
  },
  {
    id: 3,
    title: '扫描任务启动',
    description: '针对 taobao.com 的扫描任务已启动',
    type: 'scan',
    unread: false,
    time: '2024-10-19T16:45:00Z',
  },
  {
    id: 4,
    title: '系统更新通知',
    description: '系统将在今晚 23:00 进行维护升级，预计耗时 1 小时',
    type: 'system',
    unread: false,
    time: '2024-10-18T10:00:00Z',
  },
  {
    id: 5,
    title: '端口扫描完成',
    description: '针对 www.taobao.com 的端口扫描已完成，发现 5 个开放端口',
    type: 'scan',
    unread: false,
    time: '2024-10-17T12:30:00Z',
  },
  {
    id: 6,
    title: '发现中危漏洞',
    description: '在 login.taobao.com 发现 XSS 漏洞（中等级别）',
    type: 'vulnerability',
    unread: true,
    time: '2024-10-16T09:15:00Z',
    severity: 'medium',
  },
  {
    id: 7,
    title: '新增工具',
    description: '系统新增漏洞扫描工具 Nuclei v3.1.4',
    type: 'system',
    unread: false,
    time: '2024-10-15T16:30:00Z',
  },
  {
    id: 8,
    title: '扫描任务失败',
    description: '针对 qq.com 的扫描任务失败，请检查目标可达性',
    type: 'scan',
    unread: true,
    time: '2024-10-14T11:20:00Z',
  },
]

/**
 * 获取未读通知数量
 */
export function getUnreadCount(): number {
  return mockNotifications.filter(n => n.unread).length
}

/**
 * 根据ID获取通知
 */
export function getNotificationById(id: number): Notification | undefined {
  return mockNotifications.find(n => n.id === id)
}

/**
 * 获取分页通知列表
 */
export function getPaginatedNotifications(
  page = 1,
  pageSize = 10,
  unread?: boolean
) {
  let filtered = mockNotifications
  if (unread !== undefined) {
    filtered = mockNotifications.filter(n => n.unread === unread)
  }

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const notifications = filtered.slice(startIndex, endIndex)

  return {
    notifications,
    page,
    pageSize,
    total: totalCount,
    totalPages,
  }
}
