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
	// BelongsTo 关系 - 在这里配置级联删除
	Domain *Domain `json:"domain" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	// HasMany 关系 - 级联删除由子表的 BelongsTo 关系配置
	Endpoints       []Endpoint      `json:"endpoints" gorm:"foreignKey:SubdomainID"`
	Vulnerabilities []Vulnerability `json:"vulnerabilities" gorm:"foreignKey:SubdomainID"`
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
	SubdomainsCreated     int      `json:"subdomains_created"`      // 实际创建的子域名数量
	TotalUniqueSubdomains int      `json:"total_unique_subdomains"` // 去重后的唯一子域名总数
	SkippedDomains        []string `json:"skipped_domains"`         // 被跳过的根域名（不存在或未关联组织）
}

// CreateSubDomainsResponseData 创建子域名响应数据（handler 层返回给前端）
type CreateSubDomainsResponseData struct {
	SubdomainsCreated     int      `json:"subdomains_created"`      // 实际创建的子域名数量
	AlreadyExists         int      `json:"already_exists"`          // 已存在的子域名数量
	SkippedDomains        []string `json:"skipped_domains"`         // 被跳过的根域名列表
	TotalUniqueSubdomains int      `json:"total_unique_subdomains"` // 请求的唯一子域名总数
}

// GetOrgSubDomainsResponse 获取组织子域名响应
type GetOrgSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
