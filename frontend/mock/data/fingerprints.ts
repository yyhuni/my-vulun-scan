import type {
  EholeFingerprint,
  GobyFingerprint,
  WappalyzerFingerprint,
  FingersFingerprint,
  FingerPrintHubFingerprint,
  ARLFingerprint,
  FingerprintStats,
} from '@/types/fingerprint.types'
import type { PaginatedResponse } from '@/types/api-response.types'

// ==================== EHole 指纹数据（真实数据示例）====================
export const mockEholeFingerprints: EholeFingerprint[] = [
  {
    id: 1,
    cms: '致远OA',
    method: 'keyword',
    location: 'body',
    keyword: ['/seeyon/USER-DATA/IMAGES/LOGIN/login.gif'],
    isImportant: true,
    type: 'oa',
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    cms: '通达OA',
    method: 'keyword',
    location: 'body',
    keyword: ['/static/images/tongda.ico'],
    isImportant: true,
    type: 'oa',
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    cms: 'Nexus Repository Manager',
    method: 'keyword',
    location: 'title',
    keyword: ['Nexus Repository Manager'],
    isImportant: true,
    type: 'cloud',
    createdAt: '2024-12-20T10:02:00Z',
  },
  {
    id: 4,
    cms: '禅道 zentao',
    method: 'keyword',
    location: 'title',
    keyword: ['Welcome to use zentao'],
    isImportant: true,
    type: 'oa',
    createdAt: '2024-12-20T10:03:00Z',
  },
  {
    id: 5,
    cms: 'Kibana',
    method: 'keyword',
    location: 'title',
    keyword: ['Kibana'],
    isImportant: true,
    type: 'cloud',
    createdAt: '2024-12-20T10:04:00Z',
  },
  {
    id: 6,
    cms: 'Spring env',
    method: 'keyword',
    location: 'body',
    keyword: ['Whitelabel Error Page'],
    isImportant: true,
    type: 'framework',
    createdAt: '2024-12-20T10:05:00Z',
  },
  {
    id: 7,
    cms: '泛微OA',
    method: 'keyword',
    location: 'header',
    keyword: ['ecology_JSessionid'],
    isImportant: true,
    type: 'oa',
    createdAt: '2024-12-20T10:06:00Z',
  },
  {
    id: 8,
    cms: '用友NC',
    method: 'keyword',
    location: 'body',
    keyword: ['UFIDA', '/nc/servlet/nc.ui.iufo.login.Index'],
    isImportant: true,
    type: 'oa',
    createdAt: '2024-12-20T10:07:00Z',
  },
]

// ==================== Goby 指纹数据（真实数据示例）====================
export const mockGobyFingerprints: GobyFingerprint[] = [
  {
    id: 1,
    name: 'WebSphere-App-Server',
    logic: '((a||b) &&c&&d) || (e&&f&&g)',
    rule: [
      { label: 'a', feature: 'Server: WebSphere Application Server', is_equal: true },
      { label: 'b', feature: 'IBM WebSphere Application Server', is_equal: true },
      { label: 'c', feature: 'couchdb', is_equal: false },
      { label: 'd', feature: 'drupal', is_equal: false },
      { label: 'e', feature: 'Server: WebSphere Application Server', is_equal: true },
      { label: 'f', feature: 'couchdb', is_equal: false },
      { label: 'g', feature: 'drupal', is_equal: false },
    ],
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    name: 'Wing-FTP-Server',
    logic: 'a||b||c||d',
    rule: [
      { label: 'a', feature: 'Server: Wing FTP Server', is_equal: true },
      { label: 'b', feature: 'Server: Wing FTP Server', is_equal: true },
      { label: 'c', feature: '/help_javascript.htm', is_equal: true },
      { label: 'd', feature: 'Wing FTP Server', is_equal: true },
    ],
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    name: 'Fortinet-sslvpn',
    logic: 'a&&b',
    rule: [
      { label: 'a', feature: 'fgt_lang', is_equal: true },
      { label: 'b', feature: '/sslvpn/portal.html', is_equal: true },
    ],
    createdAt: '2024-12-20T10:02:00Z',
  },
  {
    id: 4,
    name: 'D-link-DSL-2640B',
    logic: 'a||b',
    rule: [
      { label: 'a', feature: 'Product : DSL-2640B', is_equal: true },
      { label: 'b', feature: 'D-Link DSL-2640B', is_equal: true },
    ],
    createdAt: '2024-12-20T10:03:00Z',
  },
  {
    id: 5,
    name: 'Kedacom-NVR',
    logic: 'a|| (b&&c) ||d',
    rule: [
      { label: 'a', feature: 'NVR Station Web', is_equal: true },
      { label: 'b', feature: 'location="index_cn.htm";', is_equal: true },
      { label: 'c', feature: 'if(syslan == "zh-cn"', is_equal: true },
      { label: 'd', feature: 'WMS browse NVR', is_equal: true },
    ],
    createdAt: '2024-12-20T10:04:00Z',
  },
]

// ==================== Wappalyzer 指纹数据（真实数据示例）====================
export const mockWappalyzerFingerprints: WappalyzerFingerprint[] = [
  {
    id: 1,
    name: '1C-Bitrix',
    cats: [1, 6],
    cookies: { bitrix_sm_guest_id: '', bitrix_sm_last_ip: '', bitrix_sm_sale_uid: '' },
    headers: { 'set-cookie': 'bitrix_', 'x-powered-cms': 'bitrix site manager' },
    scriptSrc: ['bitrix(?:\\.info/|/js/main/core)'],
    js: [],
    implies: ['PHP'],
    meta: {},
    html: [],
    description: '1C-Bitrix is a system of web project management.',
    website: 'https://www.1c-bitrix.ru',
    cpe: '',
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    name: 'React',
    cats: [12],
    cookies: {},
    headers: {},
    scriptSrc: ['react(?:-dom)?(?:\\.min)?\\.js'],
    js: ['React.version'],
    implies: [],
    meta: {},
    html: ['data-reactroot'],
    description: 'React is a JavaScript library for building user interfaces.',
    website: 'https://reactjs.org',
    cpe: 'cpe:/a:facebook:react',
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    name: 'Vue.js',
    cats: [12],
    cookies: {},
    headers: {},
    scriptSrc: ['vue(?:\\.min)?\\.js'],
    js: ['Vue.version'],
    implies: [],
    meta: {},
    html: ['data-v-'],
    description: 'Vue.js is a progressive JavaScript framework.',
    website: 'https://vuejs.org',
    cpe: 'cpe:/a:vuejs:vue',
    createdAt: '2024-12-20T10:02:00Z',
  },
  {
    id: 4,
    name: 'nginx',
    cats: [22],
    cookies: {},
    headers: { server: 'nginx(?:/([\\d.]+))?\\;version:\\1' },
    scriptSrc: [],
    js: [],
    implies: [],
    meta: {},
    html: [],
    description: 'nginx is a web server.',
    website: 'http://nginx.org/en',
    cpe: 'cpe:/a:nginx:nginx',
    createdAt: '2024-12-20T10:03:00Z',
  },
  {
    id: 5,
    name: 'WordPress',
    cats: [1, 11],
    cookies: {},
    headers: { 'x-pingback': '/xmlrpc\\.php$' },
    scriptSrc: ['/wp-(?:content|includes)/'],
    js: [],
    implies: ['PHP', 'MySQL'],
    meta: { generator: ['WordPress(?: ([\\d.]+))?\\;version:\\1'] },
    html: ['<link rel=["\']stylesheet["\'] [^>]+/wp-(?:content|includes)/'],
    description: 'WordPress is a free and open-source CMS.',
    website: 'https://wordpress.org',
    cpe: 'cpe:/a:wordpress:wordpress',
    createdAt: '2024-12-20T10:04:00Z',
  },
]

// ==================== Fingers 指纹数据（真实数据示例）====================
export const mockFingersFingerprints: FingersFingerprint[] = [
  {
    id: 1,
    name: 'jenkins',
    link: '',
    rule: [
      {
        favicon_hash: ['81586312'],
        body: 'Jenkins',
        header: 'X-Jenkins',
      },
    ],
    tag: ['cloud'],
    focus: true,
    defaultPort: [8080],
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    name: 'gitlab',
    link: '',
    rule: [
      {
        favicon_hash: ['516963061', '1278323681'],
        body: 'GitLab',
        header: '_gitlab_session',
      },
    ],
    tag: ['cloud'],
    focus: true,
    defaultPort: [80, 443],
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    name: 'nacos',
    link: '',
    rule: [
      {
        body: '<title>Nacos</title>',
        send_data: '/nacos/',
      },
    ],
    tag: ['cloud'],
    focus: true,
    defaultPort: [8848],
    createdAt: '2024-12-20T10:02:00Z',
  },
  {
    id: 4,
    name: 'elasticsearch',
    link: '',
    rule: [
      {
        body: '"cluster_name" : "elasticsearch"',
        vuln: 'elasticsearch_unauth',
      },
    ],
    tag: ['cloud'],
    focus: true,
    defaultPort: [9200],
    createdAt: '2024-12-20T10:03:00Z',
  },
  {
    id: 5,
    name: 'zabbix',
    link: '',
    rule: [
      {
        favicon_hash: ['892542951'],
        body: 'images/general/zabbix.ico',
        header: 'zbx_sessionid',
        send_data: '/zabbix',
      },
    ],
    tag: ['cloud'],
    focus: true,
    defaultPort: [80, 443],
    createdAt: '2024-12-20T10:04:00Z',
  },
]

// ==================== FingerPrintHub 指纹数据（真实数据示例）====================
export const mockFingerPrintHubFingerprints: FingerPrintHubFingerprint[] = [
  {
    id: 1,
    fpId: 'apache-tomcat',
    name: 'Apache Tomcat',
    author: 'pdteam',
    tags: 'tech,apache,tomcat',
    severity: 'info',
    metadata: {
      product: 'tomcat',
      vendor: 'apache',
      verified: true,
      shodan_query: 'http.favicon.hash:"-297069493"',
      fofa_query: 'app="Apache-Tomcat"',
    },
    http: [
      {
        method: 'GET',
        path: '/',
        matchers: [
          { type: 'word', part: 'body', words: ['Apache Tomcat'] },
          { type: 'status', status: [200] },
        ],
      },
    ],
    sourceFile: 'http/technologies/apache/apache-tomcat.yaml',
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    fpId: 'nginx-detect',
    name: 'Nginx Server',
    author: 'pdteam',
    tags: 'tech,nginx',
    severity: 'info',
    metadata: {
      product: 'nginx',
      vendor: 'nginx',
      verified: true,
    },
    http: [
      {
        method: 'GET',
        path: '/',
        matchers: [
          { type: 'regex', part: 'header', regex: ['[Nn]ginx'] },
        ],
        extractors: [
          { type: 'regex', part: 'header', regex: ['nginx/([\\d.]+)'], group: 1 },
        ],
      },
    ],
    sourceFile: 'http/technologies/nginx/nginx-version.yaml',
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    fpId: 'spring-boot-detect',
    name: 'Spring Boot',
    author: 'pdteam',
    tags: 'tech,spring,java',
    severity: 'info',
    metadata: {
      product: 'spring-boot',
      vendor: 'vmware',
      verified: true,
    },
    http: [
      {
        method: 'GET',
        path: '/',
        matchers: [
          { type: 'word', part: 'body', words: ['Whitelabel Error Page'] },
        ],
      },
    ],
    sourceFile: 'http/technologies/spring/spring-boot.yaml',
    createdAt: '2024-12-20T10:02:00Z',
  },
]

// ==================== ARL 指纹数据（真实数据示例）====================
export const mockARLFingerprints: ARLFingerprint[] = [
  {
    id: 1,
    name: 'Shiro',
    rule: 'header="rememberMe="',
    createdAt: '2024-12-20T10:00:00Z',
  },
  {
    id: 2,
    name: 'ThinkPHP',
    rule: 'body="ThinkPHP" || header="ThinkPHP"',
    createdAt: '2024-12-20T10:01:00Z',
  },
  {
    id: 3,
    name: 'Fastjson',
    rule: 'body="fastjson" || body="com.alibaba.fastjson"',
    createdAt: '2024-12-20T10:02:00Z',
  },
  {
    id: 4,
    name: 'Weblogic',
    rule: 'body="WebLogic" || header="WebLogic" || body="bea_wls_internal"',
    createdAt: '2024-12-20T10:03:00Z',
  },
  {
    id: 5,
    name: 'JBoss',
    rule: 'body="JBoss" || header="JBoss" || body="jboss.css"',
    createdAt: '2024-12-20T10:04:00Z',
  },
  {
    id: 6,
    name: 'Struts2',
    rule: 'body=".action" || body="struts"',
    createdAt: '2024-12-20T10:05:00Z',
  },
]

// ==================== 统计数据 ====================
export const mockFingerprintStats: FingerprintStats = {
  ehole: 1892,
  goby: 4567,
  wappalyzer: 3456,
  fingers: 2345,
  fingerprinthub: 8901,
  arl: 1234,
}

// ==================== 查询函数 ====================
export function getMockEholeFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<EholeFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockEholeFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.cms.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockGobyFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<GobyFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockGobyFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockWappalyzerFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<WappalyzerFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockWappalyzerFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockFingersFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<FingersFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockFingersFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockFingerPrintHubFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<FingerPrintHubFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockFingerPrintHubFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockARLFingerprints(params?: {
  page?: number
  pageSize?: number
  filter?: string
}): PaginatedResponse<ARLFingerprint> {
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const filter = params?.filter?.toLowerCase() || ''

  let filtered = mockARLFingerprints
  if (filter) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(filter))
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const results = filtered.slice(start, start + pageSize)

  return { results, total, page, pageSize, totalPages }
}

export function getMockFingerprintStats(): FingerprintStats {
  return mockFingerprintStats
}
