package models

import (
	"time"
)

// Endpoint 存储发现的 API 端点和 URL 路径信息
type Endpoint struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 核心业务字段
	URL           string `json:"url" gorm:"not null;size:2048;index"`
	Method        string `json:"method" gorm:"size:10"`
	StatusCode    *int   `json:"status_code"`
	Title         string `json:"title" gorm:"size:255"`
	ContentLength *int64 `json:"content_length"`
	SubdomainID   uint   `json:"subdomain_id" gorm:"not null;index"`

	// 关联关系
	// BelongsTo 关系 - 在这里配置级联删除
	Subdomain *SubDomain `json:"subdomain" gorm:"foreignKey:SubdomainID;constraint:OnDelete:CASCADE"`
	// HasMany 关系 - 级联删除由子表的 BelongsTo 关系配置
	Vulnerabilities []Vulnerability `json:"vulnerabilities" gorm:"foreignKey:EndPointID"`
}

// CreateEndpointsRequest 创建端点请求
type CreateEndpointsRequest struct {
	Endpoints   []EndpointDetail `json:"endpoints" binding:"required"`
	SubdomainID uint             `json:"subdomain_id" binding:"required"`
}

// EndpointDetail 端点详细信息
type EndpointDetail struct {
	URL           string `json:"url" binding:"required"`
	Method        string `json:"method"`
	StatusCode    *int   `json:"status_code"`
	Title         string `json:"title"`
	ContentLength *int64 `json:"content_length"`
}

// GetEndpointsRequest 获取所有端点列表请求
type GetEndpointsRequest struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
	SortBy    string `form:"sort_by"`    // 排序字段: url, method, status_code, created_at, updated_at
	SortOrder string `form:"sort_order"` // 排序方向: asc, desc
}

// GetEndpointsResponse 获取端点列表响应
type GetEndpointsResponse struct {
	Endpoints  []Endpoint `json:"endpoints"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	PageSize   int        `json:"page_size"`
	TotalPages int        `json:"total_pages"`
}

// CreateEndpointsResponse 创建端点响应（service 层使用）
type CreateEndpointsResponse struct {
	SuccessCount     int      `json:"success_count"`
	ExistingEndpoints []string `json:"existing_endpoints"`
	TotalRequested   int      `json:"total_requested"`
}

// CreateEndpointsResponseData 创建端点响应数据（handler 层返回给前端）
type CreateEndpointsResponseData struct {
	Message          string   `json:"message"`
	SuccessCount     int      `json:"success_count"`
	ExistingEndpoints []string `json:"existing_endpoints"`
	TotalRequested   int      `json:"total_requested"`
}
