package models

import (
	"time"
)

// SubDomain 子域名发现和特征信息存储
type SubDomain struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;index"`

	// 核心业务字段
	// 注意：Name 字段在应用层已统一转为小写，数据库层通过 CHECK 约束防止插入大写值
	// <-:create 表示该字段只在创建时可写，创建后只读
	// Name 存储完整子域名（如 api.example.com），全局唯一
	Name     string `json:"name" gorm:"not null;size:255;uniqueIndex;check:name = LOWER(name);<-:create"`
	DomainID uint   `json:"domain_id" gorm:"not null;index;<-:create"`
	IsRoot   bool   `json:"is_root" gorm:"not null;default:false;index;<-:create"` // 是否为根子域名（Domain自动创建的同名子域名），根子域名不允许删除

	// 关联关系
	// BelongsTo 关系 - 在这里配置级联删除
	Domain *Domain `json:"domain" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	// HasMany 关系 - 也需要配置级联删除，确保删除 SubDomain 时自动删除关联的 Endpoint 和 Vulnerability
	Endpoints []Endpoint `json:"endpoints" gorm:"foreignKey:SubdomainID;constraint:OnDelete:CASCADE"`
}

// CreateSubDomainsForDomainRequest 为指定域名创建子域名请求
type CreateSubDomainsForDomainRequest struct {
	Subdomains []string `json:"subdomains" binding:"required"`
}

// GetSubDomainsRequest 获取所有子域名列表请求
type GetSubDomainsRequest struct {
	BasePaginationRequest
	// 允许的排序字段：id, name, created_at, updated_at
}

// GetSubDomainsResponse 获取子域名列表响应
type GetSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	BasePaginationResponse
}

// CreateSubDomainsResponseData 创建子域名响应数据
type CreateSubDomainsResponseData struct {
	BaseBatchCreateResponseData
}

// GetOrgSubDomainsResponse 获取组织子域名响应
type GetOrgSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	BasePaginationResponse
}

// BatchDeleteSubDomainsRequest 批量删除子域名请求
type BatchDeleteSubDomainsRequest struct {
	SubDomainIDs []uint `json:"subdomain_ids" binding:"required"`
}

// BatchDeleteSubDomainsResponseData 批量删除子域名响应数据
// 优化说明：在大规模数据场景下（如100W+子域名），不返回完整对象列表以提升性能
type BatchDeleteSubDomainsResponseData struct {
	BaseBatchDeleteResponseData
}

// GetSubDomainByIDResponseData 获取单个子域名详情响应数据（包含关联的域名信息）
type GetSubDomainByIDResponseData struct {
	SubDomain *SubDomain `json:"sub_domain"`
}
