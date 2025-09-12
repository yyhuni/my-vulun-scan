package services

import (
	"fmt"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// ScanService 扫描服务
type ScanService struct {
	db *gorm.DB
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
	domainService := NewMainDomainService()
	mainDomains, err := domainService.GetOrganizationMainDomains(organizationID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get organization main domains")
		return nil, err
	}

	if len(mainDomains) == 0 {
		return nil, fmt.Errorf("organization has no main domains to scan")
	}

	var taskIDs []string

	// 使用事务创建扫描任务
	err = s.db.Transaction(func(tx *gorm.DB) error {
		for _, mainDomain := range mainDomains {
			scanTask := models.ScanTask{
				OrganizationID: organizationID,
				MainDomainID:   mainDomain.ID,
				Status:         "pending",
			}

			if err := tx.Create(&scanTask).Error; err != nil {
				log.Error().Err(err).Msg("Failed to create scan task")
				return err
			}

			taskIDs = append(taskIDs, scanTask.ID)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// 这里可以添加实际的扫描逻辑，比如启动 goroutine 进行扫描
	// 目前只是创建扫描任务记录

	response := &models.StartOrganizationScanResponse{
		TaskID:  taskIDs[0], // 返回第一个任务ID作为代表
		Message: fmt.Sprintf("成功创建 %d 个扫描任务", len(taskIDs)),
	}

	log.Info().
		Str("organization_id", organizationID).
		Int("task_count", len(taskIDs)).
		Strs("task_ids", taskIDs).
		Msg("Organization scan tasks created successfully")

	return response, nil
}

// GetOrganizationScanHistory 获取组织扫描历史
func (s *ScanService) GetOrganizationScanHistory(organizationID string) ([]models.ScanTask, error) {
	var scanTasks []models.ScanTask

	result := s.db.
		Preload("Organization").
		Preload("MainDomain").
		Preload("ScanResults").
		Where("organization_id = ?", organizationID).
		Order("created_at DESC").
		Find(&scanTasks)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organization scan history")
		return nil, result.Error
	}

	log.Info().
		Str("organization_id", organizationID).
		Int("task_count", len(scanTasks)).
		Msg("Organization scan history retrieved successfully")

	return scanTasks, nil
}

// GetScanTaskByID 根据ID获取扫描任务
func (s *ScanService) GetScanTaskByID(taskID string) (*models.ScanTask, error) {
	var scanTask models.ScanTask

	result := s.db.
		Preload("Organization").
		Preload("MainDomain").
		Preload("ScanResults").
		First(&scanTask, "id = ?", taskID)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("scan task not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query scan task")
		return nil, result.Error
	}

	log.Info().Str("task_id", taskID).Msg("Scan task retrieved successfully")
	return &scanTask, nil
}

// UpdateScanTaskStatus 更新扫描任务状态
func (s *ScanService) UpdateScanTaskStatus(taskID, status string) error {
	result := s.db.Model(&models.ScanTask{}).Where("id = ?", taskID).Update("status", status)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to update scan task status")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("scan task not found")
	}

	log.Info().
		Str("task_id", taskID).
		Str("status", status).
		Msg("Scan task status updated successfully")

	return nil
}

// CreateScanResult 创建扫描结果
func (s *ScanService) CreateScanResult(taskID, resultSummary string) (*models.ScanResult, error) {
	scanResult := models.ScanResult{
		ScanTaskID:    taskID,
		ResultSummary: resultSummary,
	}

	result := s.db.Create(&scanResult)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to create scan result")
		return nil, result.Error
	}

	log.Info().
		Str("task_id", taskID).
		Str("result_id", scanResult.ID).
		Msg("Scan result created successfully")

	return &scanResult, nil
}

// GetScanResultsByTaskID 根据任务ID获取扫描结果
func (s *ScanService) GetScanResultsByTaskID(taskID string) ([]models.ScanResult, error) {
	var scanResults []models.ScanResult

	result := s.db.Where("scan_task_id = ?", taskID).Order("created_at DESC").Find(&scanResults)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query scan results")
		return nil, result.Error
	}

	log.Info().
		Str("task_id", taskID).
		Int("result_count", len(scanResults)).
		Msg("Scan results retrieved successfully")

	return scanResults, nil
}

// GetActiveScanTasks 获取活跃的扫描任务
func (s *ScanService) GetActiveScanTasks() ([]models.ScanTask, error) {
	var scanTasks []models.ScanTask

	result := s.db.
		Preload("Organization").
		Preload("MainDomain").
		Where("status IN ?", []string{"pending", "running"}).
		Order("created_at DESC").
		Find(&scanTasks)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query active scan tasks")
		return nil, result.Error
	}

	log.Info().Int("active_task_count", len(scanTasks)).Msg("Active scan tasks retrieved successfully")
	return scanTasks, nil
}

// DeleteScanTask 删除扫描任务（级联删除扫描结果）
func (s *ScanService) DeleteScanTask(taskID string) error {
	// 检查任务是否存在
	var scanTask models.ScanTask
	result := s.db.First(&scanTask, "id = ?", taskID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return fmt.Errorf("scan task not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query scan task for deletion")
		return result.Error
	}

	// 删除扫描任务（GORM会自动处理级联删除）
	result = s.db.Delete(&scanTask)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to delete scan task")
		return result.Error
	}

	log.Info().Str("task_id", taskID).Msg("Scan task deleted successfully")
	return nil
}

// GetScanStatistics 获取扫描统计信息
func (s *ScanService) GetScanStatistics() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 总任务数
	var totalTasks int64
	if err := s.db.Model(&models.ScanTask{}).Count(&totalTasks).Error; err != nil {
		return nil, err
	}
	stats["total_tasks"] = totalTasks

	// 按状态分组统计
	var statusStats []struct {
		Status string
		Count  int64
	}
	err := s.db.Model(&models.ScanTask{}).
		Select("status, count(*) as count").
		Group("status").
		Scan(&statusStats).Error
	if err != nil {
		return nil, err
	}

	statusMap := make(map[string]int64)
	for _, stat := range statusStats {
		statusMap[stat.Status] = stat.Count
	}
	stats["status_breakdown"] = statusMap

	// 总结果数
	var totalResults int64
	if err := s.db.Model(&models.ScanResult{}).Count(&totalResults).Error; err != nil {
		return nil, err
	}
	stats["total_results"] = totalResults

	log.Info().Msg("Scan statistics retrieved successfully")
	return stats, nil
}
