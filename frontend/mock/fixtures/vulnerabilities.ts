import type { Vulnerability } from "@/types/vulnerability.types"

// Mock 漏洞数据
export const mockVulnerabilities: Vulnerability[] = [
  {
    id: 1,
    title: "SQL Injection in Login Form",
    description: "The login form is vulnerable to SQL injection attacks through the username parameter.",
    severity: "critical",
    status: "open",
    source: "nuclei",
    targetId: 1,
    domainId: 1,
    cvssScore: 9.8,
    cveId: "CVE-2024-1234",
    cweId: "CWE-89",
    proof: "Payload: ' OR '1'='1 -- resulted in authentication bypass",
    solution: "Use parameterized queries or prepared statements to prevent SQL injection.",
    references: [
      "https://owasp.org/www-community/attacks/SQL_Injection",
      "https://cwe.mitre.org/data/definitions/89.html"
    ],
    discoveredAt: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    title: "Cross-Site Scripting (XSS) in Search",
    description: "Reflected XSS vulnerability in the search functionality allows arbitrary JavaScript execution.",
    severity: "high",
    status: "in_progress",
    source: "burp",
    targetId: 1,
    domainId: 1,
    cvssScore: 7.5,
    cveId: "CVE-2024-5678",
    cweId: "CWE-79",
    proof: "<script>alert('XSS')</script> was successfully executed",
    solution: "Implement proper input validation and output encoding.",
    references: [
      "https://owasp.org/www-community/attacks/xss/",
      "https://cwe.mitre.org/data/definitions/79.html"
    ],
    discoveredAt: "2024-01-16T14:20:00Z",
    createdAt: "2024-01-16T14:20:00Z",
    updatedAt: "2024-01-20T09:15:00Z"
  },
  {
    id: 3,
    title: "Outdated SSL/TLS Protocol",
    description: "Server supports TLS 1.0 and TLS 1.1 which are deprecated and insecure.",
    severity: "medium",
    status: "resolved",
    source: "nmap",
    targetId: 1,
    domainId: 2,
    cvssScore: 5.3,
    proof: "TLS 1.0 and 1.1 were detected during SSL/TLS scan",
    solution: "Disable TLS 1.0 and 1.1, enable only TLS 1.2 and above.",
    references: [
      "https://datatracker.ietf.org/doc/rfc8996/"
    ],
    discoveredAt: "2024-01-17T11:45:00Z",
    createdAt: "2024-01-17T11:45:00Z",
    updatedAt: "2024-01-22T16:30:00Z"
  },
  {
    id: 4,
    title: "Missing Security Headers",
    description: "Important security headers like X-Frame-Options, X-Content-Type-Options are missing.",
    severity: "low",
    status: "open",
    source: "custom",
    targetId: 1,
    domainId: 1,
    cvssScore: 3.7,
    cweId: "CWE-693",
    proof: "Headers analysis shows missing: X-Frame-Options, X-Content-Type-Options, CSP",
    solution: "Add the following headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Content-Security-Policy",
    references: [
      "https://owasp.org/www-project-secure-headers/"
    ],
    discoveredAt: "2024-01-18T09:00:00Z",
    createdAt: "2024-01-18T09:00:00Z",
    updatedAt: "2024-01-18T09:00:00Z"
  },
  {
    id: 5,
    title: "Information Disclosure via Error Messages",
    description: "Detailed error messages expose sensitive information about the application stack.",
    severity: "low",
    status: "false_positive",
    source: "burp",
    targetId: 1,
    domainId: 3,
    cvssScore: 2.7,
    cweId: "CWE-209",
    proof: "Error page reveals Django version and Python traceback",
    solution: "Configure proper error handling to show generic error messages in production.",
    references: [
      "https://cwe.mitre.org/data/definitions/209.html"
    ],
    discoveredAt: "2024-01-19T13:15:00Z",
    createdAt: "2024-01-19T13:15:00Z",
    updatedAt: "2024-01-21T10:45:00Z"
  },
  {
    id: 6,
    title: "Remote Code Execution via File Upload",
    description: "File upload functionality allows uploading and executing malicious files.",
    severity: "critical",
    status: "in_progress",
    source: "nuclei",
    targetId: 1,
    domainId: 2,
    cvssScore: 9.9,
    cveId: "CVE-2024-9999",
    cweId: "CWE-434",
    proof: "Successfully uploaded PHP shell and gained remote access",
    solution: "Implement strict file type validation, store uploads outside webroot, use allow-list for file extensions.",
    references: [
      "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload"
    ],
    discoveredAt: "2024-01-20T15:30:00Z",
    createdAt: "2024-01-20T15:30:00Z",
    updatedAt: "2024-01-25T11:20:00Z"
  },
  {
    id: 7,
    title: "Weak Password Policy",
    description: "Application allows weak passwords without complexity requirements.",
    severity: "medium",
    status: "accepted",
    source: "custom",
    targetId: 1,
    cvssScore: 4.3,
    cweId: "CWE-521",
    proof: "Successfully created account with password '123456'",
    solution: "Implement strong password policy requiring minimum length, complexity, and common password checks.",
    references: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html"
    ],
    discoveredAt: "2024-01-21T08:00:00Z",
    createdAt: "2024-01-21T08:00:00Z",
    updatedAt: "2024-01-23T14:00:00Z"
  },
  {
    id: 8,
    title: "Cross-Site Request Forgery (CSRF)",
    description: "State-changing operations lack CSRF protection tokens.",
    severity: "high",
    status: "open",
    source: "burp",
    targetId: 1,
    domainId: 1,
    cvssScore: 8.1,
    cveId: "CVE-2024-8888",
    cweId: "CWE-352",
    proof: "Successfully changed user email via forged request",
    solution: "Implement CSRF tokens for all state-changing operations.",
    references: [
      "https://owasp.org/www-community/attacks/csrf"
    ],
    discoveredAt: "2024-01-22T12:45:00Z",
    createdAt: "2024-01-22T12:45:00Z",
    updatedAt: "2024-01-22T12:45:00Z"
  },
  {
    id: 9,
    title: "Server-Side Request Forgery (SSRF)",
    description: "URL fetching functionality can be abused to access internal resources.",
    severity: "high",
    status: "resolved",
    source: "nuclei",
    targetId: 1,
    domainId: 2,
    cvssScore: 7.7,
    cveId: "CVE-2024-7777",
    cweId: "CWE-918",
    proof: "Successfully accessed internal metadata service at 169.254.169.254",
    solution: "Implement URL validation, use allow-list for external domains, block private IP ranges.",
    references: [
      "https://owasp.org/www-community/attacks/Server_Side_Request_Forgery"
    ],
    discoveredAt: "2024-01-23T16:20:00Z",
    createdAt: "2024-01-23T16:20:00Z",
    updatedAt: "2024-01-26T09:00:00Z"
  },
  {
    id: 10,
    title: "Sensitive Data Exposure in API",
    description: "API endpoint returns sensitive user data without proper authorization checks.",
    severity: "critical",
    status: "open",
    source: "custom",
    targetId: 1,
    cvssScore: 9.1,
    cweId: "CWE-200",
    proof: "GET /api/users returns all user emails and phone numbers",
    solution: "Implement proper authorization checks and limit data exposure.",
    references: [
      "https://owasp.org/www-project-api-security/"
    ],
    discoveredAt: "2024-01-24T10:10:00Z",
    createdAt: "2024-01-24T10:10:00Z",
    updatedAt: "2024-01-24T10:10:00Z"
  },
  {
    id: 11,
    title: "XML External Entity (XXE) Injection",
    description: "XML parser is vulnerable to XXE attacks allowing file disclosure.",
    severity: "high",
    status: "in_progress",
    source: "burp",
    targetId: 1,
    domainId: 3,
    cvssScore: 8.6,
    cveId: "CVE-2024-6666",
    cweId: "CWE-611",
    proof: "Successfully read /etc/passwd using XXE payload",
    solution: "Disable XML external entity processing in the XML parser configuration.",
    references: [
      "https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing"
    ],
    discoveredAt: "2024-01-25T14:30:00Z",
    createdAt: "2024-01-25T14:30:00Z",
    updatedAt: "2024-01-27T11:15:00Z"
  },
  {
    id: 12,
    title: "Open Redirect",
    description: "Redirect functionality allows redirecting users to arbitrary external sites.",
    severity: "medium",
    status: "open",
    source: "custom",
    targetId: 1,
    domainId: 1,
    cvssScore: 5.4,
    cweId: "CWE-601",
    proof: "URL parameter ?redirect=https://evil.com successfully redirects users",
    solution: "Validate redirect URLs against allow-list or use relative URLs only.",
    references: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"
    ],
    discoveredAt: "2024-01-26T09:45:00Z",
    createdAt: "2024-01-26T09:45:00Z",
    updatedAt: "2024-01-26T09:45:00Z"
  },
  {
    id: 13,
    title: "Insecure Deserialization",
    description: "Application deserializes untrusted data leading to potential RCE.",
    severity: "critical",
    status: "resolved",
    source: "nuclei",
    targetId: 1,
    domainId: 2,
    cvssScore: 9.8,
    cveId: "CVE-2024-5555",
    cweId: "CWE-502",
    proof: "Crafted serialized payload executed arbitrary code",
    solution: "Avoid deserializing untrusted data, use safe serialization formats like JSON.",
    references: [
      "https://owasp.org/www-community/vulnerabilities/Deserialization_of_untrusted_data"
    ],
    discoveredAt: "2024-01-27T11:00:00Z",
    createdAt: "2024-01-27T11:00:00Z",
    updatedAt: "2024-01-28T16:30:00Z"
  },
  {
    id: 14,
    title: "Directory Traversal",
    description: "File download functionality vulnerable to path traversal attacks.",
    severity: "high",
    status: "open",
    source: "burp",
    targetId: 1,
    domainId: 3,
    cvssScore: 7.5,
    cweId: "CWE-22",
    proof: "Successfully accessed /etc/passwd using ../../ in filename parameter",
    solution: "Validate and sanitize file paths, use allow-list for allowed files.",
    references: [
      "https://owasp.org/www-community/attacks/Path_Traversal"
    ],
    discoveredAt: "2024-01-28T13:20:00Z",
    createdAt: "2024-01-28T13:20:00Z",
    updatedAt: "2024-01-28T13:20:00Z"
  },
  {
    id: 15,
    title: "JWT Algorithm Confusion",
    description: "JWT implementation vulnerable to algorithm confusion attack.",
    severity: "high",
    status: "in_progress",
    source: "custom",
    targetId: 1,
    cvssScore: 8.1,
    cweId: "CWE-347",
    proof: "Changed JWT algorithm from RS256 to HS256 and forged valid tokens",
    solution: "Explicitly specify and validate the expected algorithm, reject 'none' algorithm.",
    references: [
      "https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/"
    ],
    discoveredAt: "2024-01-29T15:40:00Z",
    createdAt: "2024-01-29T15:40:00Z",
    updatedAt: "2024-01-30T10:20:00Z"
  }
]

// 根据目标ID获取漏洞
export function getVulnerabilitiesByTargetId(targetId: number): Vulnerability[] {
  return mockVulnerabilities.filter(v => v.targetId === targetId)
}

// 根据域名ID获取漏洞
export function getVulnerabilitiesByDomainId(domainId: number): Vulnerability[] {
  return mockVulnerabilities.filter(v => v.domainId === domainId)
}

// 根据ID获取单个漏洞
export function getVulnerabilityById(id: number): Vulnerability | undefined {
  return mockVulnerabilities.find(v => v.id === id)
}

