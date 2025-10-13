package models

import (
	"time"
)

// Organization 组织管理，实现多个 Domain 的分组
type Organization struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;index"`

	// 核心业务字段
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:255"`
	Description string `json:"description" gorm:"size:1000"`

	// 关联关系 - 级联删除配置在 OrganizationDomain 中间表定义
	Domains []Domain `json:"domains" gorm:"many2many:organization_domains;constraint:OnDelete:CASCADE"`
}

// CreateOrgRequest 创建组织请求
type CreateOrgRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateOrgRequest 更新组织请求
type UpdateOrgRequest struct {
	ID          uint   `json:"id" binding:"required"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DeleteOrgRequest 删除组织请求
type DeleteOrgRequest struct {
	ID uint `json:"id" binding:"required"`
}

// BatchDeleteOrgsRequest 批量删除组织请求
type BatchDeleteOrgsRequest struct {
	OrgIDs []uint `json:"organization_ids" binding:"required"`
}

// GetOrgsRequest 获取组织列表请求
type GetOrgsRequest struct {
	Page      int    `json:"page" form:"page"`
	PageSize  int    `json:"page_size" form:"page_size"`
	SortBy    string `json:"sort_by" form:"sort_by"`       // 排序字段：id, name, created_at, updated_at
	SortOrder string `json:"sort_order" form:"sort_order"` // 排序方向：asc, desc
}

// GetOrgsResponse 获取组织列表响应
type GetOrgsResponse struct {
	Organizations []Organization `json:"organizations"`
	Total         int64          `json:"total"`
	Page          int            `json:"page"`
	PageSize      int            `json:"page_size"`
	TotalPages    int            `json:"total_pages"`
}

// OrgResponseData 组织响应数据（用于创建、更新、获取单个组织）
type OrgResponseData struct {
	Organization *Organization `json:"organization"`
}

// DeleteOrgResponseData 删除组织响应数据
type DeleteOrgResponseData struct {
	Message string `json:"message"`
}

// BatchDeleteOrgsResponseData 批量删除组织响应数据
type BatchDeleteOrgsResponseData struct {
	Message      string `json:"message"`
	DeletedCount int    `json:"deleted_count"`
}
