import type { Directory, DirectoryListResponse } from '@/types/directory.types'

export const mockDirectories: Directory[] = [
  {
    id: 1,
    url: 'https://acme.com/admin',
    status: 200,
    contentLength: 12345,
    words: 1234,
    lines: 89,
    contentType: 'text/html',
    duration: 0.234,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:00:00Z',
  },
  {
    id: 2,
    url: 'https://acme.com/api',
    status: 301,
    contentLength: 0,
    words: 0,
    lines: 0,
    contentType: 'text/html',
    duration: 0.056,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:01:00Z',
  },
  {
    id: 3,
    url: 'https://acme.com/login',
    status: 200,
    contentLength: 8765,
    words: 567,
    lines: 45,
    contentType: 'text/html',
    duration: 0.189,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:02:00Z',
  },
  {
    id: 4,
    url: 'https://acme.com/dashboard',
    status: 302,
    contentLength: 0,
    words: 0,
    lines: 0,
    contentType: 'text/html',
    duration: 0.078,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:03:00Z',
  },
  {
    id: 5,
    url: 'https://acme.com/static/js/app.js',
    status: 200,
    contentLength: 456789,
    words: 12345,
    lines: 5678,
    contentType: 'application/javascript',
    duration: 0.345,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:04:00Z',
  },
  {
    id: 6,
    url: 'https://acme.com/.git/config',
    status: 200,
    contentLength: 234,
    words: 45,
    lines: 12,
    contentType: 'text/plain',
    duration: 0.023,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:05:00Z',
  },
  {
    id: 7,
    url: 'https://acme.com/backup.zip',
    status: 200,
    contentLength: 12345678,
    words: null,
    lines: null,
    contentType: 'application/zip',
    duration: 1.234,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:06:00Z',
  },
  {
    id: 8,
    url: 'https://acme.com/robots.txt',
    status: 200,
    contentLength: 567,
    words: 89,
    lines: 23,
    contentType: 'text/plain',
    duration: 0.034,
    websiteUrl: 'https://acme.com',
    createdAt: '2024-12-28T10:07:00Z',
  },
  {
    id: 9,
    url: 'https://api.acme.com/v1/health',
    status: 200,
    contentLength: 45,
    words: 5,
    lines: 1,
    contentType: 'application/json',
    duration: 0.012,
    websiteUrl: 'https://api.acme.com',
    createdAt: '2024-12-28T10:08:00Z',
  },
  {
    id: 10,
    url: 'https://api.acme.com/swagger-ui.html',
    status: 200,
    contentLength: 23456,
    words: 1234,
    lines: 234,
    contentType: 'text/html',
    duration: 0.267,
    websiteUrl: 'https://api.acme.com',
    createdAt: '2024-12-28T10:09:00Z',
  },
  {
    id: 11,
    url: 'https://techstart.io/wp-admin',
    status: 302,
    contentLength: 0,
    words: 0,
    lines: 0,
    contentType: 'text/html',
    duration: 0.089,
    websiteUrl: 'https://techstart.io',
    createdAt: '2024-12-26T08:45:00Z',
  },
  {
    id: 12,
    url: 'https://techstart.io/wp-login.php',
    status: 200,
    contentLength: 4567,
    words: 234,
    lines: 78,
    contentType: 'text/html',
    duration: 0.156,
    websiteUrl: 'https://techstart.io',
    createdAt: '2024-12-26T08:46:00Z',
  },
]

export function getMockDirectories(params?: {
  page?: number
  pageSize?: number
  filter?: string
  targetId?: number
  scanId?: number
}): DirectoryListResponse {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockDirectories

  if (filter) {
    filtered = filtered.filter(
      d =>
        d.url.toLowerCase().includes(filter) ||
        d.contentType.toLowerCase().includes(filter)
    )
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return {
    results,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export function getMockDirectoryById(id: number): Directory | undefined {
  return mockDirectories.find(d => d.id === id)
}
