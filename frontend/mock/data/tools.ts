import type { Tool, GetToolsResponse } from '@/types/tool.types'

export const mockTools: Tool[] = [
  {
    id: 1,
    name: 'subfinder',
    type: 'opensource',
    repoUrl: 'https://github.com/projectdiscovery/subfinder',
    version: 'v2.6.3',
    description: 'Fast passive subdomain enumeration tool.',
    categoryNames: ['subdomain', 'recon'],
    directory: '/opt/tools/subfinder',
    installCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
    versionCommand: 'subfinder -version',
    createdAt: '2024-12-20T10:00:00Z',
    updatedAt: '2024-12-28T10:00:00Z',
  },
  {
    id: 2,
    name: 'httpx',
    type: 'opensource',
    repoUrl: 'https://github.com/projectdiscovery/httpx',
    version: 'v1.6.0',
    description: 'Fast and multi-purpose HTTP toolkit.',
    categoryNames: ['http', 'recon'],
    directory: '/opt/tools/httpx',
    installCommand: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
    versionCommand: 'httpx -version',
    createdAt: '2024-12-20T10:01:00Z',
    updatedAt: '2024-12-28T10:01:00Z',
  },
  {
    id: 3,
    name: 'nuclei',
    type: 'opensource',
    repoUrl: 'https://github.com/projectdiscovery/nuclei',
    version: 'v3.1.0',
    description: 'Fast and customizable vulnerability scanner.',
    categoryNames: ['vulnerability'],
    directory: '/opt/tools/nuclei',
    installCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    versionCommand: 'nuclei -version',
    createdAt: '2024-12-20T10:02:00Z',
    updatedAt: '2024-12-28T10:02:00Z',
  },
  {
    id: 4,
    name: 'naabu',
    type: 'opensource',
    repoUrl: 'https://github.com/projectdiscovery/naabu',
    version: 'v2.2.1',
    description: 'Fast port scanner written in go.',
    categoryNames: ['port', 'network'],
    directory: '/opt/tools/naabu',
    installCommand: 'go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest',
    versionCommand: 'naabu -version',
    createdAt: '2024-12-20T10:03:00Z',
    updatedAt: '2024-12-28T10:03:00Z',
  },
  {
    id: 5,
    name: 'katana',
    type: 'opensource',
    repoUrl: 'https://github.com/projectdiscovery/katana',
    version: 'v1.0.4',
    description: 'Next-generation crawling and spidering framework.',
    categoryNames: ['crawler', 'recon'],
    directory: '/opt/tools/katana',
    installCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
    updateCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
    versionCommand: 'katana -version',
    createdAt: '2024-12-20T10:04:00Z',
    updatedAt: '2024-12-28T10:04:00Z',
  },
  {
    id: 6,
    name: 'ffuf',
    type: 'opensource',
    repoUrl: 'https://github.com/ffuf/ffuf',
    version: 'v2.1.0',
    description: 'Fast web fuzzer written in Go.',
    categoryNames: ['directory', 'fuzzer'],
    directory: '/opt/tools/ffuf',
    installCommand: 'go install github.com/ffuf/ffuf/v2@latest',
    updateCommand: 'go install github.com/ffuf/ffuf/v2@latest',
    versionCommand: 'ffuf -V',
    createdAt: '2024-12-20T10:05:00Z',
    updatedAt: '2024-12-28T10:05:00Z',
  },
  {
    id: 7,
    name: 'amass',
    type: 'opensource',
    repoUrl: 'https://github.com/owasp-amass/amass',
    version: 'v4.2.0',
    description: 'In-depth attack surface mapping and asset discovery.',
    categoryNames: ['subdomain', 'recon'],
    directory: '/opt/tools/amass',
    installCommand: 'go install -v github.com/owasp-amass/amass/v4/...@master',
    updateCommand: 'go install -v github.com/owasp-amass/amass/v4/...@master',
    versionCommand: 'amass -version',
    createdAt: '2024-12-20T10:06:00Z',
    updatedAt: '2024-12-28T10:06:00Z',
  },
  {
    id: 8,
    name: 'xingfinger',
    type: 'custom',
    repoUrl: '',
    version: '1.0.0',
    description: '自定义指纹识别工具',
    categoryNames: ['recon'],
    directory: '/opt/tools/xingfinger',
    installCommand: '',
    updateCommand: '',
    versionCommand: '',
    createdAt: '2024-12-20T10:07:00Z',
    updatedAt: '2024-12-28T10:07:00Z',
  },
]

export function getMockTools(params?: {
  page?: number
  pageSize?: number
}): GetToolsResponse {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10

  const total = mockTools.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const tools = mockTools.slice(start, start + pageSize)

  return {
    tools,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export function getMockToolById(id: number): Tool | undefined {
  return mockTools.find(t => t.id === id)
}
