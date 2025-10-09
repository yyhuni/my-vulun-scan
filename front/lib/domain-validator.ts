import validator from 'validator'
import * as psl from 'psl'

/**
 * 域名验证工具类
 * 使用 validator.js 进行可靠的域名验证
 */

export interface DomainValidationResult {
  isValid: boolean
  error?: string
}

export class DomainValidator {
  /**
   * 验证域名格式（如 example.com）
   * @param domain - 要验证的域名字符串
   * @returns 验证结果
   */
  static validateDomain(domain: string): DomainValidationResult {
    // 1. 检查是否为空
    if (!domain || domain.trim().length === 0) {
      return {
        isValid: false,
        error: '域名不能为空'
      }
    }

    const trimmedDomain = domain.trim()

    // 2. 检查是否包含空格
    if (trimmedDomain.includes(' ')) {
      return {
        isValid: false,
        error: '域名不能包含空格'
      }
    }

    // 3. 检查长度（RFC 1035 标准：最大 253 字符）
    if (trimmedDomain.length > 253) {
      return {
        isValid: false,
        error: '域名长度不能超过 253 个字符'
      }
    }

    // 4. 使用 validator.js 的 isFQDN 进行严格验证
    if (!validator.isFQDN(trimmedDomain, {
      require_tld: true,           // 必须有顶级域名
      allow_underscores: false,    // 不允许下划线
      allow_trailing_dot: false,   // 不允许尾部点号
      allow_numeric_tld: false,    // 不允许纯数字顶级域名
      allow_wildcard: false,       // 不允许通配符
    })) {
      return {
        isValid: false,
        error: '域名格式无效'
      }
    }

    // 5. 检查每个标签长度（RFC 1035：每个标签最多 63 字符）
    const labels = trimmedDomain.split('.')
    for (const label of labels) {
      if (label.length > 63) {
        return {
          isValid: false,
          error: `域名标签 "${label}" 长度超过 63 个字符`
        }
      }
    }

    // 6. 检查顶级域名（至少 2 个字符，只能是字母）
    const tld = labels[labels.length - 1]
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
      return {
        isValid: false,
        error: '顶级域名格式无效'
      }
    }

    return {
      isValid: true
    }
  }

  /**
   * 验证子域名格式（如 www.example.com, api.test.org）
   * @param subdomain - 要验证的子域名字符串
   * @returns 验证结果
   */
  static validateSubdomain(subdomain: string): DomainValidationResult {
    // 先进行基本域名验证
    const basicValidation = this.validateDomain(subdomain)
    if (!basicValidation.isValid) {
      return basicValidation
    }

    // 子域名必须至少包含 3 个部分（如 www.example.com）
    const labels = subdomain.trim().split('.')
    if (labels.length < 3) {
      return {
        isValid: false,
        error: '子域名必须至少包含 3 个部分（如 www.example.com）'
      }
    }

    return {
      isValid: true
    }
  }

  /**
   * 批量验证域名列表
   * @param domains - 域名字符串数组
   * @returns 验证结果数组
   */
  static validateDomainBatch(domains: string[]): Array<DomainValidationResult & { index: number; originalDomain: string }> {
    return domains.map((domain, index) => ({
      ...this.validateDomain(domain),
      index,
      originalDomain: domain
    }))
  }

  /**
   * 批量验证子域名列表
   * @param subdomains - 子域名字符串数组
   * @returns 验证结果数组
   */
  static validateSubdomainBatch(subdomains: string[]): Array<DomainValidationResult & { index: number; originalDomain: string }> {
    return subdomains.map((subdomain, index) => ({
      ...this.validateSubdomain(subdomain),
      index,
      originalDomain: subdomain
    }))
  }

  /**
   * 规范化域名（转换为小写）
   */
  static normalize(domain: string): string | null {
    const result = this.validateDomain(domain)
    if (!result.isValid) {
      return null
    }
    return domain.trim().toLowerCase()
  }

  /**
   * 从子域名中提取根域名（使用 PSL - Public Suffix List）
   * @param subdomain - 子域名（如 www.example.com, blog.github.io）
   * @returns 根域名（如 example.com, blog.github.io）或 null
   * 
   * 示例：
   * - www.example.com → example.com
   * - api.test.example.com → example.com
   * - blog.github.io → blog.github.io (正确处理公共后缀)
   * - www.bbc.co.uk → bbc.co.uk (正确处理多级 TLD)
   */
  static extractRootDomain(subdomain: string): string | null {
    const trimmed = subdomain.trim().toLowerCase()
    if (!trimmed) return null
    
    // 使用 psl 解析域名
    const parsed = psl.parse(trimmed)
    
    // 如果解析失败或没有域名部分，返回 null
    if (parsed.error || !parsed.domain) {
      return null
    }
    
    // 返回根域名（domain 字段就是我们需要的根域名）
    return parsed.domain
  }

  /**
   * 将子域名列表按根域名分组
   * @param subdomains - 子域名列表
   * @returns { grouped: Map<根域名, 子域名[]>, invalid: 无效的子域名[] }
   */
  static groupSubdomainsByRootDomain(subdomains: string[]): {
    grouped: Map<string, string[]>
    invalid: string[]
  } {
    const grouped = new Map<string, string[]>()
    const invalid: string[] = []
    
    for (const subdomain of subdomains) {
      const rootDomain = this.extractRootDomain(subdomain)
      
      if (!rootDomain) {
        invalid.push(subdomain)
        continue
      }
      
      if (!grouped.has(rootDomain)) {
        grouped.set(rootDomain, [])
      }
      
      grouped.get(rootDomain)!.push(subdomain)
    }
    
    return { grouped, invalid }
  }
}
