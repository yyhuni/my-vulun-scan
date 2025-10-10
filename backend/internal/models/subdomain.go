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
	Name     string `json:"name" gorm:"not null;size:255;uniqueIndex;uniqueIndex:idx_subdomain_domain_name"`
	DomainID uint   `json:"domain_id" gorm:"not null;index;uniqueIndex:idx_subdomain_domain_name"`

	// 关联关系
	Domain *Domain `json:"domain" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	// Endpoint 的级联删除：删除 SubDomain 时自动删除其所有端点
	Endpoints []Endpoint `json:"endpoints" gorm:"foreignKey:SubdomainID;constraint:OnDelete:CASCADE"`
	// Vulnerability 的级联删除：删除 SubDomain 时自动删除其所有漏洞
	Vulnerabilities []Vulnerability `json:"vulnerabilities" gorm:"foreignKey:SubdomainID;constraint:OnDelete:CASCADE"`
}

// DomainGroup 域名分组（根域名 + 子域名列表）
type DomainGroup struct {
	RootDomain string   `json:"root_domain" binding:"required"`
	Subdomains []string `json:"subdomains" binding:"required"`
}

// CreateSubDomainsRequest 创建子域名请求
type CreateSubDomainsRequest struct {
	OrganizationID uint          `json:"organization_id" binding:"required"`
	DomainGroups   []DomainGroup `json:"domain_groups" binding:"required"`
}

// GetSubDomainsRequest 获取所有子域名列表请求
type GetSubDomainsRequest struct {
	Page      int    `json:"page" form:"page"`
	PageSize  int    `json:"page_size" form:"page_size"`
	SortBy    string `json:"sort_by" form:"sort_by"`       // 排序字段：id, name, created_at, updated_at
	SortOrder string `json:"sort_order" form:"sort_order"` // 排序方向：asc, desc
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
	SubdomainsCreated     int `json:"subdomains_created"`      // 实际创建的子域名数量
	TotalUniqueSubdomains int `json:"total_unique_subdomains"` // 去重后的唯一子域名总数
}

// CreateSubDomainsResponseData 创建子域名响应数据（handler 层返回给前端）
type CreateSubDomainsResponseData struct {
	Message string `json:"message"` // 响应消息，包含创建结果的详细信息
}

// GetOrgSubDomainsResponse 获取组织子域名响应
type GetOrgSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
