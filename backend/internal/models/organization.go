package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Organization 组织模型
type Organization struct {
	ID          string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	Name        string    `json:"name" gorm:"uniqueIndex;not null;size:255"`
	Description string    `json:"description" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at" gorm:"not null"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联关系
	MainDomains []MainDomain `json:"main_domains,omitempty" gorm:"many2many:organization_main_domains;constraint:OnDelete:CASCADE"`
	ScanTasks   []ScanTask   `json:"scan_tasks,omitempty" gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate GORM钩子：创建前生成UUID
func (o *Organization) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}

// TableName 指定表名
func (Organization) TableName() string {
	return "organizations"
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
