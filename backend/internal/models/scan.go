package models

import (
	"time"
)

// ScanTask 扫描任务模型
type ScanTask struct {
	ID             string    `json:"id" db:"id"`
	OrganizationID string    `json:"organization_id" db:"organization_id"`
	MainDomainID   string    `json:"main_domain_id" db:"main_domain_id"`
	Status         string    `json:"status" db:"status"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// ScanResult 扫描结果模型
type ScanResult struct {
	ID            string    `json:"id" db:"id"`
	ScanTaskID    string    `json:"scan_task_id" db:"scan_task_id"`
	ResultSummary string    `json:"result_summary" db:"result_summary"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
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
