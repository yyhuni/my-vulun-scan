/**
 * 浏览器缓存服务
 * 使用 localStorage 实现数据缓存，支持 TTL（生存时间）机制
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // 生存时间（毫秒）
}

export class CacheService {
  /**
   * 检查是否在浏览器环境中
   */
  private static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param ttl 生存时间（毫秒），默认30分钟
   */
  static set<T>(key: string, data: T, ttl: number = 30 * 60 * 1000): void {
    if (!this.isBrowser()) {
      console.warn('缓存设置失败: 非浏览器环境')
      return
    }

    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('缓存设置失败:', error)
    }
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  static get<T>(key: string): T | null {
    if (!this.isBrowser()) {
      return null
    }

    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const cacheItem: CacheItem<T> = JSON.parse(cached)
      
      // 检查是否过期
      if (this.isExpired(cacheItem)) {
        this.remove(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.warn('缓存读取失败:', error)
      return null
    }
  }

  /**
   * 检查缓存是否过期
   * @param cacheItem 缓存项
   * @returns 是否过期
   */
  private static isExpired<T>(cacheItem: CacheItem<T>): boolean {
    return Date.now() - cacheItem.timestamp > cacheItem.ttl
  }

  /**
   * 删除指定缓存
   * @param key 缓存键
   */
  static remove(key: string): void {
    if (!this.isBrowser()) {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('缓存删除失败:', error)
    }
  }

  /**
   * 清空所有缓存
   */
  static clear(): void {
    if (!this.isBrowser()) {
      return
    }

    try {
      localStorage.clear()
    } catch (error) {
      console.warn('缓存清空失败:', error)
    }
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在有效缓存
   */
  static has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * 获取缓存大小（字节）
   * @param key 缓存键
   * @returns 缓存大小，如果不存在则返回 0
   */
  static getSize(key: string): number {
    if (!this.isBrowser()) {
      return 0
    }

    try {
      const cached = localStorage.getItem(key)
      return cached ? new Blob([cached]).size : 0
    } catch (error) {
      console.warn('获取缓存大小失败:', error)
      return 0
    }
  }
} 