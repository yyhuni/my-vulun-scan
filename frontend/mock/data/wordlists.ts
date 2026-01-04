import type { Wordlist, GetWordlistsResponse } from '@/types/wordlist.types'

export const mockWordlists: Wordlist[] = [
  {
    id: 1,
    name: 'common-dirs.txt',
    description: '常用目录字典',
    fileSize: 45678,
    lineCount: 4567,
    fileHash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    createdAt: '2024-12-20T10:00:00Z',
    updatedAt: '2024-12-28T10:00:00Z',
  },
  {
    id: 2,
    name: 'subdomains-top1million.txt',
    description: 'Top 100万子域名字典',
    fileSize: 12345678,
    lineCount: 1000000,
    fileHash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7',
    createdAt: '2024-12-20T10:01:00Z',
    updatedAt: '2024-12-28T10:01:00Z',
  },
  {
    id: 3,
    name: 'api-endpoints.txt',
    description: 'API 端点字典',
    fileSize: 23456,
    lineCount: 2345,
    fileHash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8',
    createdAt: '2024-12-20T10:02:00Z',
    updatedAt: '2024-12-28T10:02:00Z',
  },
  {
    id: 4,
    name: 'params.txt',
    description: '常用参数名字典',
    fileSize: 8901,
    lineCount: 890,
    fileHash: 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9',
    createdAt: '2024-12-20T10:03:00Z',
    updatedAt: '2024-12-28T10:03:00Z',
  },
  {
    id: 5,
    name: 'sensitive-files.txt',
    description: '敏感文件字典',
    fileSize: 5678,
    lineCount: 567,
    fileHash: 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
    createdAt: '2024-12-20T10:04:00Z',
    updatedAt: '2024-12-28T10:04:00Z',
  },
  {
    id: 6,
    name: 'raft-large-directories.txt',
    description: 'RAFT 大型目录字典',
    fileSize: 987654,
    lineCount: 98765,
    fileHash: 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1',
    createdAt: '2024-12-20T10:05:00Z',
    updatedAt: '2024-12-28T10:05:00Z',
  },
]

export const mockWordlistContent = `admin
api
backup
config
dashboard
debug
dev
docs
download
files
images
js
login
logs
manager
private
public
static
test
upload
users
v1
v2
wp-admin
wp-content`

export function getMockWordlists(params?: {
  page?: number
  pageSize?: number
}): GetWordlistsResponse {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10

  const total = mockWordlists.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = mockWordlists.slice(start, start + pageSize)

  return {
    results,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export function getMockWordlistById(id: number): Wordlist | undefined {
  return mockWordlists.find(w => w.id === id)
}

export function getMockWordlistContent(): string {
  return mockWordlistContent
}
