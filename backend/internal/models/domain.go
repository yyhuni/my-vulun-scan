package models

import (
	"time"
)

// MainDomain 主域名模型
type MainDomain struct {
	ID             string    `json:"id" db:"id"`
	MainDomainName string    `json:"main_domain_name" db:"main_domain_name"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// SubDomain 子域名模型
type SubDomain struct {
	ID            string      `json:"id" db:"id"`
	SubDomainName string      `json:"sub_domain_name" db:"sub_domain_name"`
	MainDomainID  string      `json:"main_domain_id" db:"main_domain_id"`
	Status        string      `json:"status" db:"status"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at" db:"updated_at"`
	MainDomain    *MainDomain `json:"main_domain,omitempty"`
}

// OrganizationMainDomain 组织主域名关联模型
type OrganizationMainDomain struct {
	OrganizationID string `json:"organization_id" db:"organization_id"`
	MainDomainID   string `json:"main_domain_id" db:"main_domain_id"`
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
