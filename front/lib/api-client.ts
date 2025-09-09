import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：发送时转换为 snake_case
apiClient.interceptors.request.use(
  (config) => {
    // 如果有请求体数据，转换为 snake_case
    if (config.data && typeof config.data === 'object') {
      config.data = snakecaseKeys(config.data, { deep: true });
    }
    
    // 如果有查询参数，也转换为 snake_case
    if (config.params && typeof config.params === 'object') {
      config.params = snakecaseKeys(config.params, { deep: true });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：接收时转换为 camelCase
apiClient.interceptors.response.use(
  (response) => {
    // 转换响应数据为 camelCase
    if (response.data && typeof response.data === 'object') {
      response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
  },
  (error) => {
    // 错误响应也进行转换
    if (error.response?.data && typeof error.response.data === 'object') {
      error.response.data = camelcaseKeys(error.response.data, { deep: true });
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// 导出常用的 HTTP 方法 (只保留 GET 和 POST，符合新的 API 设计)
export const api = {
  get: <T = any>(url: string, config?: any) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
};

// 错误处理工具函数
export const getErrorMessage = (error: any): string => {
  if (axios.isCancel(error)) {
    return '请求已被取消';
  }
  
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试';
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return '发生未知错误';
};
