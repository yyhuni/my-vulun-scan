package models

import (
	"time"

	"gorm.io/gorm"
)

// Domain 侦察目标的核心实体，可表示域名或 IP 地址
type Domain struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 核心业务字段
	Name      string `json:"name" gorm:"uniqueIndex;not null;size:255"`
	InputType string `json:"input_type" gorm:"not null;size:100;default:'domain'"`

	// 扩展字段
	H1TeamHandle string `json:"h1_team_handle" gorm:"size:100"`
	Description  string `json:"description" gorm:"size:1000"`
	CidrRange    string `json:"cidr_range" gorm:"size:100"`

	// 关联字段
	DomainInfoID uint `json:"domain_info_id"`

	// 关联关系
	DomainInfo    *DomainInfo    `json:"domain_info,omitempty" gorm:"foreignKey:DomainInfoID;constraint:OnDelete:CASCADE"`
	Organizations []Organization `json:"organizations,omitempty" gorm:"many2many:organization_domains;constraint:OnDelete:CASCADE"`
	SubDomains    []SubDomain    `json:"sub_domains,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	// ScanHistories  []ScanHistory   `json:"scan_histories,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"` // TODO: 待实现 ScanHistory 模型
	// EndPoints      []EndPoint      `json:"end_points,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"` // TODO: 待实现 EndPoint 模型
	Vulnerabilities []Vulnerability `json:"vulnerabilities,omitempty" gorm:"-"`
	// MetaFinderDocuments []MetaFinderDocument `json:"meta_finder_documents,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"` // TODO: 待实现 MetaFinderDocument 模型
}

// OrganizationDomain 组织域名关联模型（多对多中间表）
type OrganizationDomain struct {
	OrganizationID uint `json:"organization_id" gorm:"primaryKey"`
	DomainID       uint `json:"domain_id" gorm:"primaryKey"`

	// 关联关系 - GORM 会自动管理多对多关系
	Organization *Organization `json:"organization,omitempty"`
	Domain       *Domain       `json:"domain,omitempty"`
}

// CreateDomainsRequest 创建域名请求
type CreateDomainsRequest struct {
	Domains        []DomainDetail `json:"domains" binding:"required"`
	OrganizationID uint           `json:"organization_id" binding:"required"`
}

// DomainDetail 域名详细信息
type DomainDetail struct {
	Name         string `json:"name" binding:"required"`
	H1TeamHandle string `json:"h1_team_handle,omitempty"`
	Description  string `json:"description,omitempty"`
	CidrRange    string `json:"cidr_range,omitempty"`
}

// RemoveOrganizationDomainRequest 移除组织域名关联请求
type RemoveOrganizationDomainRequest struct {
	OrganizationID uint `json:"organization_id" binding:"required"`
	DomainID       uint `json:"domain_id" binding:"required"`
}

// GetOrganizationDomainsResponse 获取组织域名响应
type GetOrganizationDomainsResponse struct {
	Domains []Domain `json:"domains"`
}

// UpdateDomainRequest 更新域名请求结构体
// 支持部分字段更新，只更新提供的非空字段
type UpdateDomainRequest struct {
	ID           uint   `json:"id" binding:"required"`    // 域名ID，必填
	Name         string `json:"name,omitempty"`           // 域名名称，可选，用于更新
	H1TeamHandle string `json:"h1_team_handle,omitempty"` // HackerOne团队句柄，可选
	Description  string `json:"description,omitempty"`    // 域名描述，可选
	CidrRange    string `json:"cidr_range,omitempty"`     // CIDR范围，可选
}

// BatchDeleteDomainsRequest 批量删除域名请求结构体
// 支持同时删除多个域名，提高操作效率
type BatchDeleteDomainsRequest struct {
	DomainIDs []uint `json:"domain_ids" binding:"required,min=1"` // 要删除的域名ID列表，至少包含一个ID
}

// SearchDomainsRequest 搜索域名请求结构体
// 支持分页搜索和模糊匹配，提高查询效率
type SearchDomainsRequest struct {
	Query    string `json:"query,omitempty"`     // 搜索关键词，支持域名名称、H1团队句柄和描述的模糊匹配
	Page     int    `json:"page,omitempty"`      // 页码，从1开始，默认值为1
	PageSize int    `json:"page_size,omitempty"` // 每页显示数量，默认值为20，最大值为100
}

// SearchDomainsResponse 搜索域名响应结构体
// 返回分页搜索结果和统计信息
type SearchDomainsResponse struct {
	Domains    []Domain `json:"domains"`     // 域名列表
	Total      int64    `json:"total"`       // 符合条件的域名总数
	Page       int      `json:"page"`        // 当前页码
	PageSize   int      `json:"page_size"`   // 每页显示数量
	TotalPages int      `json:"total_pages"` // 总页数
}
