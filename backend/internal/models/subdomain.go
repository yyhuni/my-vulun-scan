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
	Name           string    `json:"name" gorm:"not null;size:255"`
	HTTPURL        string    `json:"http_url" gorm:"size:2048"`
	DiscoveredDate time.Time `json:"discovered_date"`

	// 状态标识字段
	IsImportedSubdomain bool `json:"is_imported_subdomain" gorm:"default:false"`
	IsImportant         bool `json:"is_important"`
	IsCDN               bool `json:"is_cdn"`

	// HTTP响应字段
	HTTPStatus    int     `json:"http_status" gorm:"default:0"`
	ContentType   string  `json:"content_type" gorm:"size:100"`
	ResponseTime  float64 `json:"response_time"`
	ContentLength int     `json:"content_length"`
	PageTitle     string  `json:"page_title" gorm:"size:255"`

	// 技术信息字段
	Webserver string `json:"webserver" gorm:"size:255"`
	CNAME     string `json:"cname" gorm:"size:500"`
	CDNName   string `json:"cdn_name" gorm:"size:200"`

	// 文件路径字段
	ScreenshotPath string `json:"screenshot_path" gorm:"size:255"`
	HTTPHeaderPath string `json:"http_header_path" gorm:"size:255"`

	// 安全分析字段
	AttackSurface string `json:"attack_surface" gorm:"size:8192"`

	// 关联字段
	DomainID uint `json:"domain_id" gorm:"not null;index"`

	// 关联关系
	Domain *Domain `json:"domain,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
}

// CreateSubDomainsRequest 创建子域名请求
type CreateSubDomainsRequest struct {
	SubDomains []string `json:"sub_domains" binding:"required"`
	DomainID   uint     `json:"domain_id" binding:"required"`
	Status     string   `json:"status"`
}

// GetOrganizationSubDomainsResponse 获取组织子域名响应
type GetOrganizationSubDomainsResponse struct {
	SubDomains []SubDomain `json:"sub_domains"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}
