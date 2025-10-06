/**
 * API 客户端配置文件
 * 
 * 核心功能：
 * 1. 自动命名转换：前端驼峰 ↔ 后端下划线
 * 2. 统一错误处理
 * 3. 请求/响应日志记录
 * 
 * 命名规范说明：
 * - 前端（TypeScript/React）：驼峰命名 camelCase
 *   例如：pageSize, createdAt, organizationId
 * 
 * - 后端（Go/JSON）：下划线命名 snake_case
 *   例如：page_size, created_at, organization_id
 * 
 * - Go 结构体标签：使用 json tag 定义 JSON 序列化格式
 *   例如：`json:"page_size"` `json:"created_at"`
 * 
 * 自动转换机制详解：
 * 
 * ══════════════════════════════════════════════════════════════════════
 * 【请求流程】前端发送数据到后端
 * ══════════════════════════════════════════════════════════════════════
 * 
 * 步骤1️⃣ 前端代码（写驼峰）
 * ┌────────────────────────────────────────┐
 * │ api.get('/organizations', {            │
 * │   params: {                            │
 * │     pageSize: 10,        // 驼峰命名   │
 * │     sortBy: 'createdAt', // 驼峰命名   │
 * │     sortOrder: 'desc'                  │
 * │   }                                    │
 * │ })                                     │
 * └────────────────────────────────────────┘
 *                    ↓
 *         （调用 api.get，触发请求拦截器）
 *                    ↓
 * 步骤2️⃣ 请求拦截器自动转换（驼峰 → 下划线）
 * ┌────────────────────────────────────────┐
 * │ 拦截器接收到：                          │
 * │ params: {                              │
 * │   pageSize: 10,                        │
 * │   sortBy: 'createdAt',                 │
 * │   sortOrder: 'desc'                    │
 * │ }                                      │
 * │                                        │
 * │ 执行：snakecaseKeys(params)            │
 * │                                        │
 * │ 转换后：                                │
 * │ params: {                              │
 * │   page_size: 10,        // 下划线      │
 * │   sort_by: 'created_at',// 下划线      │
 * │   sort_order: 'desc'                   │
 * │ }                                      │
 * └────────────────────────────────────────┘
 *                    ↓
 *         （发送 HTTP 请求）
 *                    ↓
 * 步骤3️⃣ 后端收到（下划线格式）
 * ┌────────────────────────────────────────┐
 * │ GET /api/v1/organizations?             │
 * │   page_size=10&                        │
 * │   sort_by=created_at&                  │
 * │   sort_order=desc                      │
 * │                                        │
 * │ Go 后端解析到结构体：                   │
 * │ type Params struct {                   │
 * │   PageSize  int `json:"page_size"`    │
 * │   SortBy    str `json:"sort_by"`      │
 * │   SortOrder str `json:"sort_order"`   │
 * │ }                                      │
 * └────────────────────────────────────────┘
 * 
 * ══════════════════════════════════════════════════════════════════════
 * 【响应流程】后端返回数据到前端
 * ══════════════════════════════════════════════════════════════════════
 * 
 * 步骤4️⃣ 后端返回（下划线格式的 JSON）
 * ┌────────────────────────────────────────┐
 * │ {                                      │
 * │   "state": "success",                  │
 * │   "data": {                            │
 * │     "organizations": [...],            │
 * │     "page_size": 10,     // 下划线     │
 * │     "total_pages": 5,    // 下划线     │
 * │     "created_at": "2024-01-01"         │
 * │   }                                    │
 * │ }                                      │
 * └────────────────────────────────────────┘
 *                    ↓
 *         （响应拦截器自动处理）
 *                    ↓
 * 步骤5️⃣ 响应拦截器自动转换（下划线 → 驼峰）
 * ┌────────────────────────────────────────┐
 * │ 拦截器接收到：                          │
 * │ {                                      │
 * │   state: "success",                    │
 * │   data: {                              │
 * │     organizations: [...],              │
 * │     page_size: 10,                     │
 * │     total_pages: 5,                    │
 * │     created_at: "2024-01-01"           │
 * │   }                                    │
 * │ }                                      │
 * │                                        │
 * │ 执行：camelcaseKeys(response.data)     │
 * │                                        │
 * │ 转换后：                                │
 * │ {                                      │
 * │   state: "success",                    │
 * │   data: {                              │
 * │     organizations: [...],              │
 * │     pageSize: 10,        // 驼峰       │
 * │     totalPages: 5,       // 驼峰       │
 * │     createdAt: "2024-01-01" // 驼峰    │
 * │   }                                    │
 * │ }                                      │
 * └────────────────────────────────────────┘
 *                    ↓
 *         （返回给前端代码）
 *                    ↓
 * 步骤6️⃣ 前端接收（驼峰格式，直接使用）
 * ┌────────────────────────────────────────┐
 * │ const response = await api.get(...)    │
 * │                                        │
 * │ // 可以直接用驼峰访问                   │
 * │ console.log(response.data.pageSize)    │
 * │ // ✅ 输出：10                          │
 * │                                        │
 * │ console.log(response.data.totalPages)  │
 * │ // ✅ 输出：5                           │
 * │                                        │
 * │ // ❌ 不需要这样写：                    │
 * │ // response.data.page_size            │
 * └────────────────────────────────────────┘
 * 
 * ══════════════════════════════════════════════════════════════════════
 * 【关键总结】
 * ══════════════════════════════════════════════════════════════════════
 * ✅ 前端代码：全程使用驼峰命名（pageSize, createdAt）
 * ✅ 后端代码：全程使用下划线命名（page_size, created_at）
 * ✅ 拦截器：自动双向转换，前端开发者无需关心
 * ✅ 优势：前后端各自使用自己语言的命名规范，互不影响
 */

import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

/**
 * 创建 axios 实例
 * 配置基础 URL、超时时间和默认请求头
 */
const apiClient = axios.create({
  baseURL: '/api/v1',  // API 基础路径
  timeout: 30000,      // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器：发送前将数据转换为 snake_case
 * 
 * 工作流程：
 * 1. 记录请求日志（开发调试用）
 * 2. 转换请求体（POST body）：驼峰 → 下划线
 * 3. 转换查询参数（URL params）：驼峰 → 下划线
 * 
 * 转换范围：
 * ✅ config.data（请求体）
 *    示例：api.post('/org', { pageSize: 10 })
 *    转换后：{ page_size: 10 }
 * 
 * ✅ config.params（查询参数对象）
 *    示例：api.get('/org', { params: { pageSize: 10 } })
 *    转换后：?page_size=10
 * 
 * ❌ URL 中的查询字符串（已经是字符串，不转换）
 *    示例：api.get('/org?page_size=10')
 *    保持原样：?page_size=10
 * 
 * 注意事项：
 * - deep: true 表示深度转换（嵌套对象也会转换）
 * - 只转换对象类型，字符串、数字等原始类型不受影响
 */
apiClient.interceptors.request.use(
  (config) => {
    // 开发环境调试日志
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    });
    
    // 转换请求体数据为 snake_case
    // 适用于 POST/PUT 等带 body 的请求
    if (config.data && typeof config.data === 'object') {
      config.data = snakecaseKeys(config.data, { deep: true });
      console.log('📝 Data after snake_case conversion:', config.data);
    }
    
    // 转换查询参数为 snake_case
    // 适用于 GET 请求的 params 参数
    // 例如：{ params: { pageSize: 10, sortBy: 'name' } }
    // 转换为：?page_size=10&sort_by=name
    if (config.params && typeof config.params === 'object') {
      config.params = snakecaseKeys(config.params, { deep: true });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器：接收后将数据转换为 camelCase
 * 
 * 工作流程：
 * 1. 记录响应日志（开发调试用）
 * 2. 转换响应数据：下划线 → 驼峰
 * 3. 错误响应也进行转换
 * 
 * 转换示例：
 * 后端返回：
 * {
 *   state: "success",
 *   data: {
 *     page_size: 10,
 *     total_pages: 5,
 *     created_at: "2024-01-01"
 *   }
 * }
 * 
 * 前端接收：
 * {
 *   state: "success",
 *   data: {
 *     pageSize: 10,
 *     totalPages: 5,
 *     createdAt: "2024-01-01"
 *   }
 * }
 * 
 * 注意事项：
 * - deep: true 表示深度转换（嵌套对象也会转换）
 * - 成功响应和错误响应都会转换
 * - 保证前端代码中统一使用驼峰命名
 */
apiClient.interceptors.response.use(
  (response) => {
    // 开发环境调试日志
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      data: response.data
    });
    
    // 转换响应数据为 camelCase
    // 后端的 snake_case 字段会自动转换为 camelCase
    if (response.data && typeof response.data === 'object') {
      response.data = camelcaseKeys(response.data, { deep: true });
      console.log('🔄 Data after camelCase conversion:', response.data);
    }
    return response;
  },
  (error) => {
    // 错误日志记录
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message
    });
    
    // 错误响应也进行命名转换
    // 确保错误消息的字段名也是驼峰格式
    if (error.response?.data && typeof error.response.data === 'object') {
      error.response.data = camelcaseKeys(error.response.data, { deep: true });
    }
    return Promise.reject(error);
  }
);

// 导出默认的 axios 实例（一般不直接使用）
export default apiClient;

/**
 * 导出常用的 HTTP 方法
 * 
 * 设计原则：
 * - 只保留 GET 和 POST 方法，符合后端 API 设计
 * - 所有请求都会经过拦截器（自动转换命名）
 * 
 * 使用示例：
 * 
 * 1. GET 请求（推荐使用 params）：
 *    ✅ 推荐：
 *    api.get('/organizations', { 
 *      params: { pageSize: 10, sortBy: 'createdAt' }
 *    })
 *    自动转换为：/organizations?page_size=10&sort_by=created_at
 * 
 *    ❌ 不推荐（绕过自动转换）：
 *    const url = `/organizations?page_size=${pageSize}`
 *    api.get(url)
 * 
 * 2. POST 请求（请求体自动转换）：
 *    api.post('/organizations/create', {
 *      organizationName: 'test',  // 驼峰命名
 *      createdAt: '2024-01-01'
 *    })
 *    自动转换为：
 *    {
 *      organization_name: 'test',  // 下划线命名
 *      created_at: '2024-01-01'
 *    }
 * 
 * 类型参数：
 * - T: 响应数据的类型（可选）
 * - config: axios 配置对象（可选）
 */
export const api = {
  /**
   * GET 请求
   * @param url - 请求路径（相对于 baseURL）
   * @param config - axios 配置，建议使用 params 传递查询参数
   * @returns Promise<AxiosResponse<T>>
   */
  get: <T = any>(url: string, config?: any) => apiClient.get<T>(url, config),
  
  /**
   * POST 请求
   * @param url - 请求路径（相对于 baseURL）
   * @param data - 请求体数据（会自动转换为 snake_case）
   * @param config - axios 配置（可选）
   * @returns Promise<AxiosResponse<T>>
   */
  post: <T = any>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
};

/**
 * 错误处理工具函数
 * 
 * 功能：从错误对象中提取用户友好的错误消息
 * 
 * 错误优先级：
 * 1. 请求取消
 * 2. 请求超时
 * 3. 后端返回的错误消息
 * 4. axios 错误消息
 * 5. 未知错误
 * 
 * 使用示例：
 * try {
 *   await api.get('/organizations')
 * } catch (error) {
 *   const message = getErrorMessage(error)
 *   toast.error(message)
 * }
 * 
 * @param error - 错误对象（可以是任意类型）
 * @returns 用户友好的错误消息字符串
 */
export const getErrorMessage = (error: any): string => {
  // 请求被取消（用户主动取消或组件卸载）
  if (axios.isCancel(error)) {
    return '请求已被取消';
  }
  
  // 请求超时（超过 30 秒）
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试';
  }
  
  // 后端返回的错误消息（已经过驼峰转换）
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // axios 自身的错误消息
  if (error.message) {
    return error.message;
  }
  
  // 兜底错误消息
  return '发生未知错误';
};
