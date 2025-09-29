// 通用API响应类型
export interface ApiResponse<T = any> {
  code: string;          // HTTP状态码，如 "200", "400", "500"
  state: string;         // 业务状态，如 "success", "error"
  message: string;       // 响应消息
  data?: T;              // 响应数据
}
