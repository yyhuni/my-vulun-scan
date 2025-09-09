package services

import (
	"database/sql"
	"fmt"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ScanService 扫描服务
type ScanService struct {
	db *sql.DB
}

// NewScanService 创建扫描服务实例
func NewScanService() *ScanService {
	return &ScanService{
		db: database.GetDB(),
	}
}

// StartOrganizationScan 开始组织扫描
func (s *ScanService) StartOrganizationScan(organizationID string) (*models.StartOrganizationScanResponse, error) {
	// 获取组织的主域名
	domainService := NewDomainService()
	mainDomains, err := domainService.GetOrganizationMainDomains(organizationID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get organization main domains")
		return nil, err
	}

	if len(mainDomains) == 0 {
		return nil, fmt.Errorf("organization has no main domains to scan")
	}

	// 为每个主域名创建扫描任务
	tx, err := s.db.Begin()
	if err != nil {
		logrus.WithError(err).Error("Failed to begin transaction")
		return nil, err
	}
	defer tx.Rollback()

	var taskIDs []string
	for _, mainDomain := range mainDomains {
		taskID := uuid.New().String()
		insertQuery := `
			INSERT INTO scan_tasks (id, organization_id, main_domain_id, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
		`
		_, err = tx.Exec(insertQuery, taskID, organizationID, mainDomain.ID, "pending")
		if err != nil {
			logrus.WithError(err).Error("Failed to create scan task")
			return nil, err
		}
		taskIDs = append(taskIDs, taskID)
	}

	if err := tx.Commit(); err != nil {
		logrus.WithError(err).Error("Failed to commit transaction")
		return nil, err
	}

	// 这里可以添加实际的扫描逻辑，比如启动 goroutine 进行扫描
	// 目前只是创建扫描任务记录

	response := &models.StartOrganizationScanResponse{
		TaskID:  taskIDs[0], // 返回第一个任务ID作为代表
		Message: fmt.Sprintf("成功创建 %d 个扫描任务", len(taskIDs)),
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": organizationID,
		"task_count":      len(taskIDs),
		"task_ids":        taskIDs,
	}).Info("Organization scan tasks created successfully")

	return response, nil
}

// GetOrganizationScanHistory 获取组织扫描历史
func (s *ScanService) GetOrganizationScanHistory(organizationID string) ([]models.ScanTask, error) {
	query := `
		SELECT id, organization_id, main_domain_id, status, created_at, updated_at
		FROM scan_tasks
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, organizationID)
	if err != nil {
		logrus.WithError(err).Error("Failed to query organization scan history")
		return nil, err
	}
	defer rows.Close()

	var scanTasks []models.ScanTask
	for rows.Next() {
		var task models.ScanTask
		err := rows.Scan(
			&task.ID, &task.OrganizationID, &task.MainDomainID, &task.Status,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			logrus.WithError(err).Error("Failed to scan scan task")
			return nil, err
		}
		scanTasks = append(scanTasks, task)
	}

	if err = rows.Err(); err != nil {
		logrus.WithError(err).Error("Error iterating scan tasks")
		return nil, err
	}

	return scanTasks, nil
}
