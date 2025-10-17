package models

import (
	"time"
)

// Domain 侦察目标的核心实体，专门表示域名
type Domain struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;index"`

	// 核心业务字段
	// 注意：Name 字段在应用层已统一转为小写，数据库层通过 CHECK 约束防止插入大写值
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:255;check:name = LOWER(name)"`
	Description string `json:"description" gorm:"size:1000"`

	// 关联关系 - 级联删除配置在 OrganizationDomain 中间表定义
	Organizations []Organization `json:"organizations" gorm:"many2many:organization_domains"`
	// HasMany 关系 - 也需要配置级联删除，确保删除 Domain 时自动删除关联的 SubDomain、Endpoint 和 Vulnerability
	SubDomains []SubDomain `json:"sub_domains" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	Endpoints  []Endpoint  `json:"endpoints" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"` // 冗余关联
}

// CreateDomainsRequest 创建域名请求
type CreateDomainsRequest struct {
	Domains []DomainDetail `json:"domains" binding:"required"`
	OrgID   uint           `json:"organization_id" binding:"required"`
}

// CreateDomainsResponseData 创建域名响应数据
type CreateDomainsResponseData struct {
	BaseBatchCreateResponseData
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

// BatchDeleteDomainsDirectRequest 批量删除域名请求（不依赖组织）
type BatchDeleteDomainsDirectRequest struct {
	DomainIDs []uint `json:"domain_ids" binding:"required"`
}

// GetDomainsByOrgIDRequest 获取组织域名请求(支持分页和排序)
type GetDomainsByOrgIDRequest struct {
	OrgID uint `uri:"id" binding:"required"` // 组织ID（路径参数）
	BasePaginationRequest
	// 允许的排序字段: name, created_at, updated_at
}

// GetOrgDomainsResponse 获取组织域名响应
type GetOrgDomainsResponse struct {
	Domains []Domain `json:"domains"`
	BasePaginationResponse
}

// DeleteDomainResponseData 从组织移除域名响应数据
type DeleteDomainResponseData struct {
	BaseDeleteResponse
}

// BatchDeleteDomainsRequest 批量从组织移除域名请求
// 注意：organization_id 从路径参数获取，不在请求体中
type BatchDeleteDomainsRequest struct {
	DomainIDs []uint `json:"domain_ids" binding:"required"`
}

// BatchDeleteDomainsResponseData 批量移除域名响应数据
type BatchDeleteDomainsResponseData struct {
	BaseBatchDeleteResponseData
}

// BatchDeleteDomainsDirectResponseData 批量直接删除域名响应数据
type BatchDeleteDomainsDirectResponseData struct {
	BaseBatchDeleteResponseData
}

// DomainResponseData 域名详情响应数据（不包含组织信息）
type DomainResponseData struct {
	ID          uint      `json:"id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
}

// GetDomainsRequest 获取所有域名请求（支持分页和排序）
type GetDomainsRequest struct {
	BasePaginationRequest
	// 允许的排序字段: name, created_at, updated_at
}

// GetDomainsResponse 获取所有域名响应
type GetDomainsResponse struct {
	Domains []Domain `json:"domains"`
	BasePaginationResponse
}
