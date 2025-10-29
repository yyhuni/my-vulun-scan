/**
 * Mock 数据 - 工具
 */
import type { Tool } from '@/types/tool.types'

export const mockTools: Tool[] = [
  {
    id: 1,
    name: 'subfinder',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
    repoUrl: 'https://github.com/projectdiscovery/subfinder',
    version: 'v2.6.5',
    description: 'Fast passive subdomain enumeration tool',
    categoryNames: ['subdomain', 'recon'],
    directory: '/usr/local/bin',
    installCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
    versionCommand: 'subfinder -version',
  },
  {
    id: 2,
    name: 'nmap',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
    repoUrl: 'https://github.com/nmap/nmap',
    version: '7.94',
    description: 'Network exploration tool and security / port scanner',
    categoryNames: ['port', 'network'],
    directory: '/usr/local/bin',
    installCommand: 'brew install nmap',
    updateCommand: 'brew upgrade nmap',
    versionCommand: 'nmap --version',
  },
  {
    id: 3,
    name: 'nuclei',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-17T10:30:00Z',
    repoUrl: 'https://github.com/projectdiscovery/nuclei',
    version: 'v3.1.4',
    description: 'Fast and customisable vulnerability scanner',
    categoryNames: ['vulnerability', 'scanner'],
    directory: '/usr/local/bin',
    installCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    versionCommand: 'nuclei -version',
  },
  {
    id: 4,
    name: 'katana',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-18T11:45:00Z',
    repoUrl: 'https://github.com/projectdiscovery/katana',
    version: 'v1.0.4',
    description: 'Next-generation crawling and spidering framework',
    categoryNames: ['crawler', 'recon'],
    directory: '/usr/local/bin',
    installCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
    updateCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
    versionCommand: 'katana -version',
  },
  {
    id: 5,
    name: 'dirsearch',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-19T13:20:00Z',
    repoUrl: 'https://github.com/maurosoria/dirsearch',
    version: 'v0.4.3',
    description: 'Web path scanner',
    categoryNames: ['directory', 'recon'],
    directory: '/usr/local/bin',
    installCommand: 'pip3 install dirsearch',
    updateCommand: 'pip3 install --upgrade dirsearch',
    versionCommand: 'dirsearch --version',
  },
  {
    id: 6,
    name: 'httpx',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    repoUrl: 'https://github.com/projectdiscovery/httpx',
    version: 'v1.3.7',
    description: 'Fast and multi-purpose HTTP toolkit',
    categoryNames: ['http', 'recon'],
    directory: '/usr/local/bin',
    installCommand: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
    updateCommand: 'go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest',
    versionCommand: 'httpx -version',
  },
  {
    id: 7,
    name: 'ffuf',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-21T15:45:00Z',
    repoUrl: 'https://github.com/ffuf/ffuf',
    version: 'v2.1.0',
    description: 'Fast web fuzzer written in Go',
    categoryNames: ['fuzzer', 'recon'],
    directory: '/usr/local/bin',
    installCommand: 'go install github.com/ffuf/ffuf/v2@latest',
    updateCommand: 'go install github.com/ffuf/ffuf/v2@latest',
    versionCommand: 'ffuf -V',
  },
  {
    id: 8,
    name: 'sqlmap',
    type: 'opensource',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-22T16:00:00Z',
    repoUrl: 'https://github.com/sqlmapproject/sqlmap',
    version: '1.8',
    description: 'Automatic SQL injection and database takeover tool',
    categoryNames: ['vulnerability', 'sql'],
    directory: '/usr/local/bin',
    installCommand: 'pip3 install sqlmap',
    updateCommand: 'pip3 install --upgrade sqlmap',
    versionCommand: 'sqlmap --version',
  },
]

/**
 * 根据ID获取工具
 */
export function getToolById(id: number): Tool | undefined {
  return mockTools.find(tool => tool.id === id)
}

/**
 * 获取分页工具列表
 */
export function getPaginatedTools(page = 1, pageSize = 10) {
  const totalCount = mockTools.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const tools = mockTools.slice(startIndex, endIndex)

  return {
    tools,
    page,
    pageSize,
    total: totalCount,
    totalPages,
  }
}
