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
	// 注意：Name 字段在应用层已统一转为小写，数据库层通过 CHECK 约束防止插入大写值
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:255;check:name = LOWER(name)"`
	Description string `json:"description" gorm:"size:1000"`

	// 关联关系 - 级联删除配置在 OrganizationDomain 中间表定义
	Organizations []Organization `json:"organizations" gorm:"many2many:organization_domains"`
	// HasMany 关系 - 也需要配置级联删除，确保删除 Domain 时自动删除关联的 SubDomain、Endpoint 和 Vulnerability
	SubDomains      []SubDomain     `json:"sub_domains" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	Endpoints       []Endpoint      `json:"endpoints" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`  // 冗余关联
	Vulnerabilities []Vulnerability `json:"vulnerabilities" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
}

// CreateDomainsRequest 创建域名请求
type CreateDomainsRequest struct {
	Domains []DomainDetail `json:"domains" binding:"required"`
	OrgID   uint           `json:"organization_id" binding:"required"`
}

// DomainDetail 域名详细信息
type DomainDetail struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateDomainRequest 更新域名请求
// 使用指针类型允许区分"不更新"和"清空"
type UpdateDomainRequest struct {
	ID          uint    `json:"id" binding:"required"`
	Name        *string `json:"name"`        // 指针类型：nil=不更新，空字符串=清空，有值=更新
	Description *string `json:"description"` // 指针类型：nil=不更新，空字符串=清空，有值=更新
}

// DeleteDomainRequest 从组织移除域名请求
type DeleteDomainRequest struct {
	OrgID    uint `json:"organization_id" binding:"required"`
	DomainID uint `json:"domain_id" binding:"required"`
}

// GetDomainsByOrgIDRequest 获取组织域名请求(支持分页和排序)
type GetDomainsByOrgIDRequest struct {
	OrgID     uint   `uri:"id" binding:"required"` // 组织ID（路径参数）
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
	SortBy    string `form:"sort_by"`    // 排序字段: name, created_at, updated_at
	SortOrder string `form:"sort_order"` // 排序方向: asc, desc
}

// GetOrgDomainsResponse 获取组织域名响应
type GetOrgDomainsResponse struct {
	Domains    []Domain `json:"domains"`
	Total      int64    `json:"total"`
	Page       int      `json:"page"`
	PageSize   int      `json:"page_size"`
	TotalPages int      `json:"total_pages"`
}

// DeleteDomainResponseData 从组织移除域名响应数据
type DeleteDomainResponseData struct {
	Message string `json:"message"`
}

// BatchDeleteDomainsRequest 批量从组织移除域名请求
type BatchDeleteDomainsRequest struct {
	OrgID     uint   `json:"organization_id" binding:"required"`
	DomainIDs []uint `json:"domain_ids" binding:"required"`
}

// BatchDeleteDomainsResponseData 批量移除域名响应数据
type BatchDeleteDomainsResponseData struct {
	Message      string `json:"message"`
	SuccessCount int    `json:"success_count"` // 成功移除的数量
	FailedCount  int    `json:"failed_count"`  // 失败的数量
}

// DomainResponseData 域名详情响应数据（不包含组织信息）
type DomainResponseData struct {
	ID          uint      `json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
}

// GetAllDomainsRequest 获取所有域名请求（支持分页和排序）
type GetAllDomainsRequest struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
	SortBy    string `form:"sort_by"`    // 排序字段: name, created_at, updated_at
	SortOrder string `form:"sort_order"` // 排序方向: asc, desc
}

// GetAllDomainsResponse 获取所有域名响应
type GetAllDomainsResponse struct {
	Domains    []Domain `json:"domains"`
	Total      int64    `json:"total"`
	Page       int      `json:"page"`
	PageSize   int      `json:"page_size"`
	TotalPages int      `json:"total_pages"`
}
