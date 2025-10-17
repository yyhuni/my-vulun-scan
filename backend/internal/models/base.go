package models

// BasePaginationRequest 基础分页请求参数
// 所有需要分页的请求都应该嵌入此结构体，统一管理分页逻辑
// 注意：所有接口固定按 updated_at desc 排序，不支持自定义排序
type BasePaginationRequest struct {
	Page     int `form:"page" json:"page"`           // 页码，默认 1
	PageSize int `form:"page_size" json:"page_size"` // 每页数量，默认 10
}

// SetDefaults 设置默认值
// 在 Handler 层参数绑定后调用，统一设置分页参数默认值
func (r *BasePaginationRequest) SetDefaults() {
	if r.Page <= 0 {
		r.Page = 1
	}
	if r.PageSize <= 0 {
		r.PageSize = 10
	}
}

