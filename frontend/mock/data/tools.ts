/**
 * Mock 数据 - 工具
 */

import type { Tool } from "@/types/tool.types"

export const mockTools: Tool[] = [
  {
    id: 1,
    name: "Nuclei",
    description: "基于模板的快速漏洞扫描器",
    repoUrl: "https://github.com/projectdiscovery/nuclei",
    version: "v3.0.0",
    categoryNames: ["vulnerability_scan", "web_scan"],
    installCommand: "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
    updateCommand: "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
    versionCommand: "nuclei -version",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    name: "Subfinder",
    description: "被动子域名发现工具",
    repoUrl: "https://github.com/projectdiscovery/subfinder",
    version: "v2.6.3",
    categoryNames: ["subdomain_enum"],
    installCommand: "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    updateCommand: "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
    versionCommand: "subfinder -version",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-16T00:00:00Z",
  },
  {
    id: 3,
    name: "HTTPX",
    description: "快速 HTTP 探测工具",
    repoUrl: "https://github.com/projectdiscovery/httpx",
    version: "v1.3.7",
    categoryNames: ["port_scan", "web_scan"],
    installCommand: "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    updateCommand: "go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest",
    versionCommand: "httpx -version",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-17T00:00:00Z",
  },
  {
    id: 4,
    name: "Nmap",
    description: "网络探测和安全审计工具",
    repoUrl: "https://nmap.org",
    version: "7.94",
    categoryNames: ["port_scan"],
    installCommand: "brew install nmap",
    updateCommand: "brew upgrade nmap",
    versionCommand: "nmap --version",
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-18T00:00:00Z",
  },
]

let nextToolId = 5
export const getNextToolId = () => nextToolId++
