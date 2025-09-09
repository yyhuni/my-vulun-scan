package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ScanTask 扫描任务模型
type ScanTask struct {
	ID             string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string    `json:"organization_id" gorm:"type:uuid;not null;index"`
	MainDomainID   string    `json:"main_domain_id" gorm:"type:uuid;not null;index"`
	Status         string    `json:"status" gorm:"size:50;not null;default:'pending'"`
	CreatedAt      time.Time `json:"created_at" gorm:"not null"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"not null"`

	// 关联关系
	Organization *Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	MainDomain   *MainDomain   `json:"main_domain,omitempty" gorm:"foreignKey:MainDomainID;constraint:OnDelete:CASCADE"`
	ScanResults  []ScanResult  `json:"scan_results,omitempty" gorm:"foreignKey:ScanTaskID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate GORM钩子：创建前生成UUID
func (s *ScanTask) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// TableName 指定表名
func (ScanTask) TableName() string {
	return "scan_tasks"
}

// ScanResult 扫描结果模型
type ScanResult struct {
	ID            string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	ScanTaskID    string    `json:"scan_task_id" gorm:"type:uuid;not null;index"`
	ResultSummary string    `json:"result_summary" gorm:"type:text"`
	CreatedAt     time.Time `json:"created_at" gorm:"not null"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"not null"`

	// 关联关系
	ScanTask *ScanTask `json:"scan_task,omitempty" gorm:"foreignKey:ScanTaskID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate GORM钩子：创建前生成UUID
func (s *ScanResult) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// TableName 指定表名
func (ScanResult) TableName() string {
	return "scan_results"
}

// StartOrganizationScanRequest 开始组织扫描请求
type StartOrganizationScanRequest struct {
	OrganizationID string `json:"organization_id" binding:"required"`
}

// StartOrganizationScanResponse 开始组织扫描响应
type StartOrganizationScanResponse struct {
	TaskID  string `json:"task_id"`
	Message string `json:"message"`
}

// GetOrganizationScanHistoryResponse 获取组织扫描历史响应
type GetOrganizationScanHistoryResponse struct {
	ScanTasks []ScanTask `json:"scan_tasks"`
}
