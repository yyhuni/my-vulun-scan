package models

import (
	"time"
)

// Organization 组织管理，实现多个 Domain 的分组
type Organization struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 核心业务字段
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:255"`
	Description string `json:"description" gorm:"size:1000"`

	// 关联关系
	Domains []Domain `json:"domains,omitempty" gorm:"many2many:organization_domains"`
}

// CreateOrganizationRequest 创建组织请求
type CreateOrganizationRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateOrganizationRequest 更新组织请求
type UpdateOrganizationRequest struct {
	ID          uint   `json:"id" binding:"required"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DeleteOrganizationRequest 删除组织请求
type DeleteOrganizationRequest struct {
	OrganizationID uint `json:"organization_id" binding:"required"`
}
