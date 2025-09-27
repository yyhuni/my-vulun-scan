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
