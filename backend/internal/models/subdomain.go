package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

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

// CreateSubDomainsRequest 创建子域名请求
type CreateSubDomainsRequest struct {
	SubDomains   []string `json:"sub_domains" binding:"required"`
	MainDomainID string   `json:"main_domain_id" binding:"required"`
	Status       string   `json:"status"`
}

// GetOrganizationSubDomainsResponse 获取组织子域名响应
type GetOrganizationSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
