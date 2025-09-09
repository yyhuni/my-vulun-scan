package models

import (
	"time"
)

// Organization 组织模型
type Organization struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// CreateOrganizationRequest 创建组织请求
type CreateOrganizationRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateOrganizationRequest 更新组织请求
type UpdateOrganizationRequest struct {
	ID          string `json:"id" binding:"required"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// DeleteOrganizationRequest 删除组织请求
type DeleteOrganizationRequest struct {
	OrganizationID string `json:"organization_id" binding:"required"`
}
