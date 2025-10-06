package models

import (
	"time"
)

// SubDomain 子域名发现和特征信息存储
type SubDomain struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 核心业务字段
	Name     string `json:"name" gorm:"not null;size:255"`
	DomainID uint   `json:"domain_id" gorm:"not null;index"`

	// 关联关系
	Domain *Domain `json:"domain,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
}

// CreateSubDomainsRequest 创建子域名请求
type CreateSubDomainsRequest struct {
	SubDomains []string `json:"sub_domains" binding:"required"`
	DomainID   uint     `json:"domain_id" binding:"required"`
}

// GetSubDomainsRequest 获取子域名列表请求
type GetSubDomainsRequest struct {
	DomainID       uint   `json:"domain_id,omitempty"`       // 可选，按域名ID筛选
	OrganizationID uint   `json:"organization_id,omitempty"` // 可选，按组织ID筛选
	Page           int    `json:"page,omitempty"`
	PageSize       int    `json:"page_size,omitempty"`
	SortBy         string `json:"sort_by,omitempty"`    // 排序字段：id, name, created_at, updated_at
	SortOrder      string `json:"sort_order,omitempty"` // 排序方向：asc, desc
}

// GetSubDomainsResponse 获取子域名列表响应
type GetSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}

// CreateSubDomainsResponse 创建子域名响应（service 层使用）
type CreateSubDomainsResponse struct {
	SuccessCount    int      `json:"success_count"`
	ExistingDomains []string `json:"existing_domains"`
	TotalRequested  int      `json:"total_requested"`
}

// CreateSubDomainsResponseData 创建子域名响应数据（handler 层返回给前端）
type CreateSubDomainsResponseData struct {
	Message         string   `json:"message"`
	SuccessCount    int      `json:"success_count"`
	ExistingDomains []string `json:"existing_domains"`
	TotalRequested  int      `json:"total_requested"`
}

// GetOrganizationSubDomainsResponse 获取组织子域名响应
type GetOrganizationSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
