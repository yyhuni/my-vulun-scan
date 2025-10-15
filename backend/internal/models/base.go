package models

// BasePaginationRequest 基础分页请求参数
// 所有需要分页的请求都应该嵌入此结构体，统一管理分页逻辑
type BasePaginationRequest struct {
	Page      int    `form:"page" json:"page"`             // 页码，默认 1
	PageSize  int    `form:"page_size" json:"page_size"`   // 每页数量，默认 10
	SortBy    string `form:"sort_by" json:"sort_by"`       // 排序字段，默认 updated_at
	SortOrder string `form:"sort_order" json:"sort_order"` // 排序方向，默认 desc
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
	if r.SortBy == "" {
		r.SortBy = "updated_at"
	}
	if r.SortOrder == "" {
		r.SortOrder = "desc"
	}
}

// ValidateSortFields 验证排序字段是否合法
// allowedFields: 允许的排序字段列表
func (r *BasePaginationRequest) ValidateSortFields(allowedFields []string) bool {
	if r.SortBy == "" {
		return true // 空值会被 SetDefaults 设置为默认值
	}
	
	for _, field := range allowedFields {
		if r.SortBy == field {
			return true
		}
	}
	return false
}

// ValidateSortOrder 验证排序方向是否合法
func (r *BasePaginationRequest) ValidateSortOrder() bool {
	if r.SortOrder == "" {
		return true // 空值会被 SetDefaults 设置为默认值
	}
	return r.SortOrder == "asc" || r.SortOrder == "desc"
}
