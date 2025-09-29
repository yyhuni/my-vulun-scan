package models

import (
	"time"

	"gorm.io/gorm"
)

// SubDomain 子域名发现和特征信息存储
type SubDomain struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

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

// GetOrganizationSubDomainsResponse 获取组织子域名响应
type GetOrganizationSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
