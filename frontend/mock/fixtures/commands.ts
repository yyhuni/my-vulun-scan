/**
 * Mock 数据 - 命令
 */
import type { Command } from '@/types/command.types'

export const mockCommands: Command[] = [
  {
    id: 1,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    tool_id: 1,
    tool: {
      id: 1,
      name: 'subfinder',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/projectdiscovery/subfinder',
      version: 'v2.6.5',
      description: 'Fast passive subdomain enumeration tool',
      categoryNames: ['subdomain', 'recon'],
      directory: '',
      installCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      updateCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      versionCommand: 'subfinder -version',
    },
    name: 'subdomain_scan',
    display_name: '子域名扫描',
    description: '使用 subfinder 进行子域名扫描',
    command_template: 'subfinder -d {{domain}} -o {{output}}',
  },
  {
    id: 2,
    created_at: '2024-01-16T11:20:00Z',
    updated_at: '2024-01-16T11:20:00Z',
    tool_id: 2,
    tool: {
      id: 2,
      name: 'nmap',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/nmap/nmap',
      version: '7.94',
      description: 'Network exploration tool and security / port scanner',
      categoryNames: ['port', 'network'],
      directory: '',
      installCommand: 'brew install nmap',
      updateCommand: 'brew upgrade nmap',
      versionCommand: 'nmap --version',
    },
    name: 'port_scan',
    display_name: '端口扫描',
    description: '使用 nmap 进行端口扫描',
    command_template: 'nmap -sV -p- {{target}} -oX {{output}}',
  },
  {
    id: 3,
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z',
    tool_id: 1,
    tool: {
      id: 1,
      name: 'subfinder',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/projectdiscovery/subfinder',
      version: 'v2.6.5',
      description: 'Fast passive subdomain enumeration tool',
      categoryNames: ['subdomain', 'recon'],
      directory: '',
      installCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      updateCommand: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest',
      versionCommand: 'subfinder -version',
    },
    name: 'fast_subdomain_scan',
    display_name: '快速子域名扫描',
    description: '使用 subfinder 快速扫描常见子域名',
    command_template: 'subfinder -d {{domain}} -silent -o {{output}}',
  },
  {
    id: 4,
    created_at: '2024-01-18T14:45:00Z',
    updated_at: '2024-01-18T14:45:00Z',
    tool_id: 3,
    tool: {
      id: 3,
      name: 'nuclei',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/projectdiscovery/nuclei',
      version: 'v3.1.4',
      description: 'Fast and customisable vulnerability scanner',
      categoryNames: ['vulnerability', 'scanner'],
      directory: '',
      installCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      updateCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      versionCommand: 'nuclei -version',
    },
    name: 'vulnerability_scan',
    display_name: '漏洞扫描',
    description: '使用 nuclei 进行漏洞扫描',
    command_template: 'nuclei -u {{target}} -severity critical,high,medium -o {{output}}',
  },
  {
    id: 5,
    created_at: '2024-01-19T16:00:00Z',
    updated_at: '2024-01-19T16:00:00Z',
    tool_id: 4,
    tool: {
      id: 4,
      name: 'katana',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/projectdiscovery/katana',
      version: 'v1.0.4',
      description: 'Next-generation crawling and spidering framework',
      categoryNames: ['crawler', 'recon'],
      directory: '',
      installCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
      updateCommand: 'go install github.com/projectdiscovery/katana/cmd/katana@latest',
      versionCommand: 'katana -version',
    },
    name: 'web_crawl',
    display_name: '网页爬取',
    description: '使用 katana 爬取网页链接',
    command_template: 'katana -u {{target}} -d 3 -o {{output}}',
  },
  {
    id: 6,
    created_at: '2024-01-20T10:30:00Z',
    updated_at: '2024-01-20T10:30:00Z',
    tool_id: 2,
    tool: {
      id: 2,
      name: 'nmap',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/nmap/nmap',
      version: '7.94',
      description: 'Network exploration tool and security / port scanner',
      categoryNames: ['port', 'network'],
      directory: '',
      installCommand: 'brew install nmap',
      updateCommand: 'brew upgrade nmap',
      versionCommand: 'nmap --version',
    },
    name: 'service_detect',
    display_name: '服务识别',
    description: '使用 nmap 进行服务版本识别',
    command_template: 'nmap -sV {{target}} -oX {{output}}',
  },
  {
    id: 7,
    created_at: '2024-01-21T13:20:00Z',
    updated_at: '2024-01-21T13:20:00Z',
    tool_id: 5,
    tool: {
      id: 5,
      name: 'dirsearch',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/maurosoria/dirsearch',
      version: 'v0.4.3',
      description: 'Web path scanner',
      categoryNames: ['directory', 'recon'],
      directory: '',
      installCommand: 'pip3 install dirsearch',
      updateCommand: 'pip3 install --upgrade dirsearch',
      versionCommand: 'dirsearch --version',
    },
    name: 'dir_scan',
    display_name: '目录扫描',
    description: '使用 dirsearch 进行目录扫描',
    command_template: 'dirsearch -u {{target}} -e php,html,js -o {{output}}',
  },
  {
    id: 8,
    created_at: '2024-01-22T15:10:00Z',
    updated_at: '2024-01-22T15:10:00Z',
    tool_id: 3,
    tool: {
      id: 3,
      name: 'nuclei',
      type: 'opensource',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      repoUrl: 'https://github.com/projectdiscovery/nuclei',
      version: 'v3.1.4',
      description: 'Fast and customisable vulnerability scanner',
      categoryNames: ['vulnerability', 'scanner'],
      directory: '',
      installCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      updateCommand: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
      versionCommand: 'nuclei -version',
    },
    name: 'full_vulnerability_scan',
    display_name: '完整漏洞扫描',
    description: '使用 nuclei 进行全面漏洞扫描',
    command_template: 'nuclei -u {{target}} -t nuclei-templates/ -o {{output}}',
  },
]

/**
 * 根据ID获取命令
 */
export function getCommandById(id: number): Command | undefined {
  return mockCommands.find(cmd => cmd.id === id)
}

/**
 * 获取分页命令列表
 */
export function getPaginatedCommands(page = 1, pageSize = 10, toolId?: number) {
  let filtered = mockCommands
  if (toolId) {
    filtered = mockCommands.filter(cmd => cmd.tool_id === toolId)
  }

  const totalCount = filtered.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const commands = filtered.slice(startIndex, endIndex)

  return {
    commands,
    page,
    page_size: pageSize,
    total_count: totalCount,
    total_pages: totalPages,
  }
}
