import type { IPAddress, GetIPAddressesResponse } from '@/types/ip-address.types'

// 使用函数生成IP地址
const ip = (a: number, b: number, c: number, d: number) => `${a}.${b}.${c}.${d}`

export const mockIPAddresses: IPAddress[] = [
  {
    ip: ip(192, 0, 2, 1),
    hosts: ['router.local', 'gateway.lan'],
    ports: [80, 443, 22, 53],
    createdAt: '2024-12-28T10:00:00Z',
  },
  {
    ip: ip(192, 0, 2, 10),
    hosts: ['api.acme.com', 'backend.acme.com'],
    ports: [80, 443, 8080, 3306],
    createdAt: '2024-12-28T10:01:00Z',
  },
  {
    ip: ip(192, 0, 2, 11),
    hosts: ['web.acme.com', 'www.acme.com'],
    ports: [80, 443],
    createdAt: '2024-12-28T10:02:00Z',
  },
  {
    ip: ip(198, 51, 100, 50),
    hosts: ['db.internal.acme.com'],
    ports: [3306, 5432, 27017],
    createdAt: '2024-12-28T10:03:00Z',
  },
  {
    ip: ip(203, 0, 113, 50),
    hosts: ['cdn.acme.com'],
    ports: [80, 443],
    createdAt: '2024-12-28T10:04:00Z',
  },
  {
    ip: ip(198, 51, 100, 10),
    hosts: ['mail.acme.com', 'smtp.acme.com'],
    ports: [25, 465, 587, 993, 995],
    createdAt: '2024-12-28T10:05:00Z',
  },
  {
    ip: ip(192, 0, 2, 100),
    hosts: ['jenkins.acme.com'],
    ports: [8080, 50000],
    createdAt: '2024-12-28T10:06:00Z',
  },
  {
    ip: ip(192, 0, 2, 101),
    hosts: ['gitlab.acme.com'],
    ports: [80, 443, 22],
    createdAt: '2024-12-28T10:07:00Z',
  },
  {
    ip: ip(192, 0, 2, 102),
    hosts: ['k8s.acme.com', 'kubernetes.acme.com'],
    ports: [6443, 10250, 10251, 10252],
    createdAt: '2024-12-28T10:08:00Z',
  },
  {
    ip: ip(192, 0, 2, 103),
    hosts: ['elastic.acme.com'],
    ports: [9200, 9300, 5601],
    createdAt: '2024-12-28T10:09:00Z',
  },
  {
    ip: ip(192, 0, 2, 104),
    hosts: ['redis.acme.com'],
    ports: [6379],
    createdAt: '2024-12-28T10:10:00Z',
  },
  {
    ip: ip(192, 0, 2, 105),
    hosts: ['mq.acme.com', 'rabbitmq.acme.com'],
    ports: [5672, 15672],
    createdAt: '2024-12-28T10:11:00Z',
  },
]

export function getMockIPAddresses(params?: {
  page?: number
  pageSize?: number
  filter?: string
  targetId?: number
  scanId?: number
}): GetIPAddressesResponse {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockIPAddresses

  if (filter) {
    filtered = filtered.filter(
      ipAddr =>
        ipAddr.ip.toLowerCase().includes(filter) ||
        ipAddr.hosts.some(h => h.toLowerCase().includes(filter))
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

export function getMockIPAddressByIP(ipStr: string): IPAddress | undefined {
  return mockIPAddresses.find(addr => addr.ip === ipStr)
}
