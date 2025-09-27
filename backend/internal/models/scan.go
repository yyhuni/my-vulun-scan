package models

import (
	"time"

	"gorm.io/gorm"
)

// ScanTask 扫描任务模型
type ScanTask struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 关联字段
	OrganizationID uint `json:"organization_id" gorm:"not null;index"`
	DomainID       uint `json:"domain_id" gorm:"not null;index"`

	// 业务字段
	Status string `json:"status" gorm:"size:50;not null;default:'pending'"`

	// 关联关系
	Organization *Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	Domain       *Domain       `json:"domain,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
	ScanResults  []ScanResult  `json:"scan_results,omitempty" gorm:"foreignKey:ScanTaskID;constraint:OnDelete:CASCADE"`
}

// ScanResult 扫描结果模型
type ScanResult struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 关联字段
	ScanTaskID uint `json:"scan_task_id" gorm:"not null;index"`

	// 业务字段
	ResultSummary string `json:"result_summary" gorm:"size:1000"`

	// 关联关系
	ScanTask *ScanTask `json:"scan_task,omitempty" gorm:"foreignKey:ScanTaskID;constraint:OnDelete:CASCADE"`
}

// StartOrganizationScanRequest 开始组织扫描请求
type StartOrganizationScanRequest struct {
	OrganizationID uint `json:"organization_id" binding:"required"`
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
