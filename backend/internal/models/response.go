package models

// APIResponse 通用API响应结构
type APIResponse struct {
	Code    string      `json:"code"`    // HTTP状态码，如 "200", "400", "500"
	State   string      `json:"state"`   // 业务状态，如 "success", "error"
	Message string      `json:"message"` // 响应消息
	Data    interface{} `json:"data"`    // 响应数据
}

// BaseBatchCreateResponse 通用批量创建响应基础结构
type BaseBatchCreateResponse struct {
	Message        string `json:"message"`         // 详细说明
	TotalRequested int    `json:"total_requested"` // 请求创建的总数量
	NewCreated     int    `json:"new_created"`     // 新创建的数量
	AlreadyExisted int    `json:"already_existed"` // 已存在的数量
}

// BaseBatchDeleteResponse 通用批量删除响应基础结构
type BaseBatchDeleteResponse struct {
	Message      string `json:"message"`       // 操作结果描述
	DeletedCount int    `json:"deleted_count"` // 实际删除的数量
}

// BasePaginationResponse 通用分页响应基础结构
type BasePaginationResponse struct {
	Total      int64 `json:"total"`       // 总记录数
	Page       int   `json:"page"`        // 当前页码
	PageSize   int   `json:"page_size"`   // 每页数量
	TotalPages int   `json:"total_pages"` // 总页数
}

// BaseDeleteResponse 通用删除响应基础结构（单个资源删除）
type BaseDeleteResponse struct {
	Message string `json:"message"` // 操作结果描述
}

// BaseMessageResponse 通用消息响应基础结构（仅返回操作结果消息）
type BaseMessageResponse struct {
	Message string `json:"message"` // 操作结果描述
}
