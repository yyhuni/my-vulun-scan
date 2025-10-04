// 通用API响应类型
export interface ApiResponse<T = any> {
  code: string;          // HTTP状态码，如 "200", "400", "500"
  state: string;         // 业务状态，如 "success", "error"
  message: string;       // 响应消息
  data?: T;              // 响应数据
}

// 组织列表响应类型（匹配后端GetOrganizationsResponse）
export interface OrganizationsResponse<T> {
  organizations: T[];    // 组织数据列表
  total: number;         // 总记录数
  page: number;          // 当前页码（从1开始）
  pageSize: number;      // 每页大小
  totalPages: number;    // 总页数
}
