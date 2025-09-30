// 通用API响应类型
export interface ApiResponse<T = any> {
  code: string;          // HTTP状态码，如 "200", "400", "500"
  message: string;       // 响应消息
  data?: T;              // 响应数据
}
