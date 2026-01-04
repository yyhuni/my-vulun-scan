import type {
  NucleiTemplateTreeNode,
  NucleiTemplateTreeResponse,
  NucleiTemplateContent,
} from '@/types/nuclei.types'

export const mockNucleiTemplateTree: NucleiTemplateTreeNode[] = [
  {
    type: 'folder',
    name: 'cves',
    path: 'cves',
    children: [
      {
        type: 'folder',
        name: '2024',
        path: 'cves/2024',
        children: [
          {
            type: 'file',
            name: 'CVE-2024-1234.yaml',
            path: 'cves/2024/CVE-2024-1234.yaml',
            templateId: 'CVE-2024-1234',
            severity: 'critical',
            tags: ['cve', 'rce'],
          },
          {
            type: 'file',
            name: 'CVE-2024-5678.yaml',
            path: 'cves/2024/CVE-2024-5678.yaml',
            templateId: 'CVE-2024-5678',
            severity: 'high',
            tags: ['cve', 'sqli'],
          },
        ],
      },
      {
        type: 'folder',
        name: '2023',
        path: 'cves/2023',
        children: [
          {
            type: 'file',
            name: 'CVE-2023-9876.yaml',
            path: 'cves/2023/CVE-2023-9876.yaml',
            templateId: 'CVE-2023-9876',
            severity: 'high',
            tags: ['cve', 'auth-bypass'],
          },
        ],
      },
    ],
  },
  {
    type: 'folder',
    name: 'vulnerabilities',
    path: 'vulnerabilities',
    children: [
      {
        type: 'folder',
        name: 'generic',
        path: 'vulnerabilities/generic',
        children: [
          {
            type: 'file',
            name: 'sqli-error-based.yaml',
            path: 'vulnerabilities/generic/sqli-error-based.yaml',
            templateId: 'sqli-error-based',
            severity: 'high',
            tags: ['sqli', 'generic'],
          },
          {
            type: 'file',
            name: 'xss-reflected.yaml',
            path: 'vulnerabilities/generic/xss-reflected.yaml',
            templateId: 'xss-reflected',
            severity: 'medium',
            tags: ['xss', 'generic'],
          },
        ],
      },
    ],
  },
  {
    type: 'folder',
    name: 'technologies',
    path: 'technologies',
    children: [
      {
        type: 'file',
        name: 'nginx-version.yaml',
        path: 'technologies/nginx-version.yaml',
        templateId: 'nginx-version',
        severity: 'info',
        tags: ['tech', 'nginx'],
      },
      {
        type: 'file',
        name: 'apache-detect.yaml',
        path: 'technologies/apache-detect.yaml',
        templateId: 'apache-detect',
        severity: 'info',
        tags: ['tech', 'apache'],
      },
    ],
  },
  {
    type: 'folder',
    name: 'exposures',
    path: 'exposures',
    children: [
      {
        type: 'folder',
        name: 'configs',
        path: 'exposures/configs',
        children: [
          {
            type: 'file',
            name: 'git-config.yaml',
            path: 'exposures/configs/git-config.yaml',
            templateId: 'git-config',
            severity: 'medium',
            tags: ['exposure', 'git'],
          },
          {
            type: 'file',
            name: 'env-file.yaml',
            path: 'exposures/configs/env-file.yaml',
            templateId: 'env-file',
            severity: 'high',
            tags: ['exposure', 'env'],
          },
        ],
      },
    ],
  },
]

export const mockNucleiTemplateContent: Record<string, NucleiTemplateContent> = {
  'cves/2024/CVE-2024-1234.yaml': {
    path: 'cves/2024/CVE-2024-1234.yaml',
    name: 'CVE-2024-1234.yaml',
    templateId: 'CVE-2024-1234',
    severity: 'critical',
    tags: ['cve', 'rce'],
    content: `id: CVE-2024-1234

info:
  name: Example RCE Vulnerability
  author: pdteam
  severity: critical
  description: |
    Example remote code execution vulnerability.
  reference:
    - https://example.com/cve-2024-1234
  tags: cve,cve2024,rce

http:
  - method: POST
    path:
      - "{{BaseURL}}/api/execute"
    headers:
      Content-Type: application/json
    body: '{"cmd": "id"}'
    matchers:
      - type: word
        words:
          - "uid="
          - "gid="
        condition: and
`,
  },
  'vulnerabilities/generic/sqli-error-based.yaml': {
    path: 'vulnerabilities/generic/sqli-error-based.yaml',
    name: 'sqli-error-based.yaml',
    templateId: 'sqli-error-based',
    severity: 'high',
    tags: ['sqli', 'generic'],
    content: `id: sqli-error-based

info:
  name: Error Based SQL Injection
  author: pdteam
  severity: high
  tags: sqli,generic

http:
  - method: GET
    path:
      - "{{BaseURL}}/?id=1'"
    matchers:
      - type: word
        words:
          - "SQL syntax"
          - "mysql_fetch"
          - "You have an error"
        condition: or
`,
  },
  'technologies/nginx-version.yaml': {
    path: 'technologies/nginx-version.yaml',
    name: 'nginx-version.yaml',
    templateId: 'nginx-version',
    severity: 'info',
    tags: ['tech', 'nginx'],
    content: `id: nginx-version

info:
  name: Nginx Version Detection
  author: pdteam
  severity: info
  tags: tech,nginx

http:
  - method: GET
    path:
      - "{{BaseURL}}/"
    matchers:
      - type: regex
        part: header
        regex:
          - "nginx/([\\d.]+)"
    extractors:
      - type: regex
        part: header
        group: 1
        regex:
          - "nginx/([\\d.]+)"
`,
  },
}

export function getMockNucleiTemplateTree(): NucleiTemplateTreeResponse {
  return {
    roots: mockNucleiTemplateTree,
  }
}

export function getMockNucleiTemplateContent(path: string): NucleiTemplateContent | undefined {
  return mockNucleiTemplateContent[path]
}
