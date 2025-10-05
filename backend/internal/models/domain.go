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

// GetOrganizationDomainsRequest 获取组织域名请求
type GetOrganizationDomainsRequest struct {
	OrganizationID uint `form:"organization_id" binding:"required"`
}

// GetOrganizationDomainsResponse 获取组织域名响应
type GetOrganizationDomainsResponse struct {
	Domains []Domain `json:"domains"`
}

// UpdateDomainRequest 更新域名请求结构体
type UpdateDomainRequest struct {
	ID          uint   `json:"id" binding:"required"`
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
}

// BatchDeleteDomainsRequest 批量删除域名请求结构体
type BatchDeleteDomainsRequest struct {
	DomainIDs []uint `json:"domain_ids" binding:"required,min=1"`
}

// SearchDomainsRequest 搜索域名请求结构体
type SearchDomainsRequest struct {
	Query    string `json:"query,omitempty"`
	Page     int    `json:"page,omitempty"`
	PageSize int    `json:"page_size,omitempty"`
}

// SearchDomainsResponse 搜索域名响应结构体
type SearchDomainsResponse struct {
	Domains    []Domain `json:"domains"`
	Total      int64    `json:"total"`
	Page       int      `json:"page"`
	PageSize   int      `json:"page_size"`
	TotalPages int      `json:"total_pages"`
}
