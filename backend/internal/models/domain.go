package models

import (
	"time"
)

// Domain 侦察目标的核心实体，专门表示域名
type Domain struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 核心业务字段
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:255"`
	Description string `json:"description" gorm:"size:1000"`

	// 关联关系 - 级联删除配置在 OrganizationDomain 中间表定义
	Organizations []Organization `json:"organizations,omitempty" gorm:"many2many:organization_domains"`
	// SubDomain 的级联删除：删除 Domain 时自动删除其所有子域名
	SubDomains []SubDomain `json:"sub_domains,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
}

// CreateDomainsRequest 创建域名请求
type CreateDomainsRequest struct {
	Domains        []DomainDetail `json:"domains" binding:"required"`
	OrganizationID uint           `json:"organization_id" binding:"required"`
}

// DomainDetail 域名详细信息
type DomainDetail struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
}

// RemoveOrganizationDomainRequest 移除组织域名关联请求
type RemoveOrganizationDomainRequest struct {
	OrganizationID uint `json:"organization_id" binding:"required"`
	DomainID       uint `json:"domain_id" binding:"required"`
}

// GetOrganizationDomainsRequest 获取组织域名请求(支持分页和排序)
type GetOrganizationDomainsRequest struct {
	OrganizationID uint   `form:"organization_id" binding:"required"`
	Page           int    `form:"page"`
	PageSize       int    `form:"page_size"`
	SortBy         string `form:"sort_by"`    // 排序字段: name, created_at, updated_at
	SortOrder      string `form:"sort_order"` // 排序方向: asc, desc
}

// GetOrganizationDomainsResponse 获取组织域名响应
type GetOrganizationDomainsResponse struct {
	Domains    []Domain `json:"domains"`
	Total      int64    `json:"total"`
	Page       int      `json:"page"`
	PageSize   int      `json:"page_size"`
	TotalPages int      `json:"total_pages"`
}
