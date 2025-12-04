import type {
  NucleiTemplateTreeNode,
  NucleiTemplateContent,
  UploadNucleiTemplatePayload,
} from "@/types/nuclei.types"

const MOCK_TREE: NucleiTemplateTreeNode[] = [
  {
    type: "folder",
    name: "自定义模板",
    path: "custom",
    children: [
      {
        type: "folder",
        name: "http",
        path: "custom/http",
        children: [
          {
            type: "file",
            name: "custom-http-example.yaml",
            path: "custom/http/custom-http-example.yaml",
            templateId: "custom-http-example",
            severity: "medium",
            tags: ["http", "custom"],
          },
        ],
      },
    ],
  },
  {
    type: "folder",
    name: "公共模板",
    path: "public",
    children: [
      {
        type: "folder",
        name: "cves",
        path: "public/cves",
        children: [
          {
            type: "file",
            name: "cve-2024-xxxx.yaml",
            path: "public/cves/cve-2024-xxxx.yaml",
            templateId: "cve-2024-xxxx",
            severity: "high",
            tags: ["cve", "rce"],
          },
        ],
      },
      {
        type: "folder",
        name: "cloud",
        path: "public/cloud",
        children: [
          {
            type: "file",
            name: "cloud-config-misconfig.yaml",
            path: "public/cloud/cloud-config-misconfig.yaml",
            templateId: "cloud-config-misconfig",
            severity: "medium",
            tags: ["cloud"],
          },
        ],
      },
    ],
  },
]

const MOCK_CONTENTS: Record<string, NucleiTemplateContent> = {
  "custom/http/custom-http-example.yaml": {
    path: "custom/http/custom-http-example.yaml",
    name: "custom-http-example.yaml",
    templateId: "custom-http-example",
    severity: "medium",
    tags: ["http", "custom"],
    content: `id: custom-http-example

info:
  name: Custom HTTP Example
  author: you
  severity: medium
  tags: http,custom

http:
  - method: GET
    path:
      - "{{BaseURL}}/.well-known/custom-example"

    matchers:
      - type: status
        status:
          - 200
`,
  },
  "public/cves/cve-2024-xxxx.yaml": {
    path: "public/cves/cve-2024-xxxx.yaml",
    name: "cve-2024-xxxx.yaml",
    templateId: "cve-2024-xxxx",
    severity: "high",
    tags: ["cve", "rce"],
    content: `id: cve-2024-xxxx

info:
  name: Sample CVE 2024 RCE
  author: nuclei
  severity: high
  tags: cve,rce

http:
  - method: GET
    path:
      - "{{BaseURL}}/vulnerable-endpoint"

    matchers:
      - type: word
        words:
          - "vulnerable"
`,
  },
  "public/cloud/cloud-config-misconfig.yaml": {
    path: "public/cloud/cloud-config-misconfig.yaml",
    name: "cloud-config-misconfig.yaml",
    templateId: "cloud-config-misconfig",
    severity: "medium",
    tags: ["cloud"],
    content: `id: cloud-config-misconfig

info:
  name: Cloud Config Misconfiguration
  author: nuclei
  severity: medium
  tags: cloud,config

http:
  - method: GET
    path:
      - "{{BaseURL}}/.well-known/cloud-config"
`,
  },
}

export async function getNucleiTemplateTree(): Promise<NucleiTemplateTreeNode[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return MOCK_TREE
}

export async function getNucleiTemplateContent(path: string): Promise<NucleiTemplateContent> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const existing = MOCK_CONTENTS[path]
  if (existing) {
    return existing
  }
  const name = path.split("/").pop() || path
  return {
    path,
    name,
    content: "# 暂无此模板的模拟内容",
  }
}

export async function refreshNucleiTemplates(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800))
}

export async function uploadNucleiTemplate(_payload: UploadNucleiTemplatePayload): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800))
}
