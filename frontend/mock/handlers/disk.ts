import { http, HttpResponse } from 'msw'
import type { DiskStats } from '@/types/disk.types'

const BASE_URL = '/api'

export const diskHandlers = [
  // 获取磁盘统计
  http.get(`${BASE_URL}/system/disk/`, () => {
    // 使用稳定的非零数据，避免 UI 显示 0
    const GB = 1024 * 1024 * 1024
    const total = 500 * GB // 500 GB
    const used = 275 * GB  // 275 GB 已使用（55%）
    const free = total - used

    const data: DiskStats = {
      totalBytes: total,
      usedBytes: used,
      freeBytes: free,
    }
    return HttpResponse.json(data)
  }),

  // 删除所有扫描结果
  http.post(`${BASE_URL}/system/disk/delete-scan-results/`, async () => {
    await new Promise(r => setTimeout(r, 600))
    return HttpResponse.json({ message: '已删除所有扫描结果' })
  }),

  // 删除所有截图
  http.post(`${BASE_URL}/system/disk/delete-screenshots/`, async () => {
    await new Promise(r => setTimeout(r, 600))
    return HttpResponse.json({ message: '已删除所有截图' })
  }),
]
