package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MainDomain 主域名模型
type MainDomain struct {
	ID             string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	MainDomainName string    `json:"main_domain_name" gorm:"uniqueIndex;not null;size:255"`
	CreatedAt      time.Time `json:"created_at" gorm:"not null"`

	// 关联关系
	Organizations []Organization `json:"organizations,omitempty" gorm:"many2many:organization_main_domains;constraint:OnDelete:CASCADE"`
	SubDomains    []SubDomain    `json:"sub_domains,omitempty" gorm:"foreignKey:MainDomainID;constraint:OnDelete:CASCADE"`
	ScanTasks     []ScanTask     `json:"scan_tasks,omitempty" gorm:"foreignKey:MainDomainID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate GORM钩子：创建前生成UUID
func (m *MainDomain) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// TableName 指定表名
func (MainDomain) TableName() string {
	return "main_domains"
}

// SubDomain 子域名模型
type SubDomain struct {
	ID            string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	SubDomainName string    `json:"sub_domain_name" gorm:"not null;size:255"`
	MainDomainID  string    `json:"main_domain_id" gorm:"type:uuid;not null;index"`
	Status        string    `json:"status" gorm:"size:50;not null;default:'unknown'"`
	CreatedAt     time.Time `json:"created_at" gorm:"not null"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"not null"`

	// 关联关系
	MainDomain *MainDomain `json:"main_domain,omitempty" gorm:"foreignKey:MainDomainID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate GORM钩子：创建前生成UUID
func (s *SubDomain) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// TableName 指定表名
func (SubDomain) TableName() string {
	return "sub_domains"
}

// OrganizationMainDomain 组织主域名关联模型（多对多中间表）
type OrganizationMainDomain struct {
	OrganizationID string `json:"organization_id" gorm:"type:uuid;primaryKey"`
	MainDomainID   string `json:"main_domain_id" gorm:"type:uuid;primaryKey"`

	// 关联关系
	Organization *Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	MainDomain   *MainDomain   `json:"main_domain,omitempty" gorm:"foreignKey:MainDomainID;constraint:OnDelete:CASCADE"`
}

// TableName 指定表名
func (OrganizationMainDomain) TableName() string {
	return "organization_main_domains"
}

// CreateMainDomainsRequest 创建主域名请求
type CreateMainDomainsRequest struct {
	MainDomains    []string `json:"main_domains" binding:"required"`
	OrganizationID string   `json:"organization_id" binding:"required"`
}

// CreateSubDomainsRequest 创建子域名请求
type CreateSubDomainsRequest struct {
	SubDomains   []string `json:"sub_domains" binding:"required"`
	MainDomainID string   `json:"main_domain_id" binding:"required"`
	Status       string   `json:"status"`
}

// RemoveOrganizationMainDomainRequest 移除组织主域名关联请求
type RemoveOrganizationMainDomainRequest struct {
	OrganizationID string `json:"organization_id" binding:"required"`
	MainDomainID   string `json:"main_domain_id" binding:"required"`
}

// GetOrganizationMainDomainsResponse 获取组织主域名响应
type GetOrganizationMainDomainsResponse struct {
	MainDomains []MainDomain `json:"main_domains"`
}

// GetOrganizationSubDomainsResponse 获取组织子域名响应
type GetOrganizationSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
