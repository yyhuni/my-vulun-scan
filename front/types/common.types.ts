// 通用类型定义

// 分页信息接口
export interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 分页和排序参数接口
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string    // 排序字段：id, name, createdAt, updatedAt（使用驼峰命名）
  sortOrder?: "asc" | "desc"  // 排序方向：asc, desc
}

