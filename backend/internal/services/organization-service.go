package services

import (
	"fmt"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// OrganizationService 组织服务
type OrganizationService struct {
	db *gorm.DB
}

// NewOrganizationService 创建组织服务实例
func NewOrganizationService() *OrganizationService {
	return &OrganizationService{
		db: database.GetDB(),
	}
}

// GetOrganizations 获取所有组织
func (s *OrganizationService) GetOrganizations() ([]models.Organization, error) {
	var organizations []models.Organization

	result := s.db.Order("created_at DESC").Find(&organizations)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organizations")
		return nil, result.Error
	}

	log.Info().Int("count", len(organizations)).Msg("Organizations retrieved successfully")
	return organizations, nil
}

// GetOrganizationByID 根据ID获取组织
func (s *OrganizationService) GetOrganizationByID(id string) (*models.Organization, error) {
	var org models.Organization

	result := s.db.First(&org, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("organization not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query organization")
		return nil, result.Error
	}

	log.Info().Str("id", id).Msg("Organization retrieved successfully")
	return &org, nil
}

// GetOrganizationWithRelations 根据ID获取组织及其关联数据
func (s *OrganizationService) GetOrganizationWithRelations(id string) (*models.Organization, error) {
	var org models.Organization

	result := s.db.Preload("MainDomains").Preload("ScanTasks").First(&org, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("organization not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query organization with relations")
		return nil, result.Error
	}

	log.Info().Str("id", id).Msg("Organization with relations retrieved successfully")
	return &org, nil
}

// CreateOrganization 创建组织
func (s *OrganizationService) CreateOrganization(req models.CreateOrganizationRequest) (*models.Organization, error) {
	org := models.Organization{
		Name:        req.Name,
		Description: req.Description,
	}

	result := s.db.Create(&org)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to create organization")
		return nil, result.Error
	}

	log.Info().
		Str("id", org.ID).
		Str("name", org.Name).
		Msg("Organization created successfully")

	return &org, nil
}

// UpdateOrganization 更新组织
func (s *OrganizationService) UpdateOrganization(req models.UpdateOrganizationRequest) (*models.Organization, error) {
	var org models.Organization

	// 先查询是否存在
	result := s.db.First(&org, "id = ?", req.ID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("organization not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query organization for update")
		return nil, result.Error
	}

	// 更新字段
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	result = s.db.Model(&org).Updates(updates)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to update organization")
		return nil, result.Error
	}

	log.Info().
		Str("id", org.ID).
		Str("name", org.Name).
		Msg("Organization updated successfully")

	return &org, nil
}

// DeleteOrganization 删除组织
func (s *OrganizationService) DeleteOrganization(organizationID string) error {
	// 检查组织是否存在
	var org models.Organization
	result := s.db.First(&org, "id = ?", organizationID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return fmt.Errorf("organization not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query organization for deletion")
		return result.Error
	}

	// 删除组织（GORM会自动处理级联删除）
	result = s.db.Delete(&org)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to delete organization")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("no rows affected during deletion")
	}

	log.Info().Str("id", organizationID).Msg("Organization deleted successfully")
	return nil
}

// GetOrganizationStats 获取组织统计信息
func (s *OrganizationService) GetOrganizationStats(organizationID string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 获取主域名数量
	var mainDomainCount int64
	err := s.db.Model(&models.OrganizationMainDomain{}).Where("organization_id = ?", organizationID).Count(&mainDomainCount).Error
	if err != nil {
		log.Error().Err(err).Msg("Failed to count main domains")
		return nil, err
	}
	stats["main_domain_count"] = mainDomainCount

	// 获取子域名数量
	var subDomainCount int64
	err = s.db.Table("sub_domains sd").
		Joins("JOIN main_domains md ON sd.main_domain_id = md.id").
		Joins("JOIN organization_main_domains omd ON md.id = omd.main_domain_id").
		Where("omd.organization_id = ?", organizationID).
		Count(&subDomainCount).Error
	if err != nil {
		log.Error().Err(err).Msg("Failed to count sub domains")
		return nil, err
	}
	stats["sub_domain_count"] = subDomainCount

	// 获取扫描任务数量
	var scanTaskCount int64
	err = s.db.Model(&models.ScanTask{}).Where("organization_id = ?", organizationID).Count(&scanTaskCount).Error
	if err != nil {
		log.Error().Err(err).Msg("Failed to count scan tasks")
		return nil, err
	}
	stats["scan_task_count"] = scanTaskCount

	// 获取漏洞数量
	var vulnerabilityCount int64
	err = s.db.Model(&models.Vulnerability{}).Where("organization_id = ?", organizationID).Count(&vulnerabilityCount).Error
	if err != nil {
		log.Error().Err(err).Msg("Failed to count vulnerabilities")
		return nil, err
	}
	stats["vulnerability_count"] = vulnerabilityCount

	log.Info().Str("organization_id", organizationID).Msg("Organization stats retrieved successfully")
	return stats, nil
}

// SearchOrganizations 搜索组织
func (s *OrganizationService) SearchOrganizations(keyword string) ([]models.Organization, error) {
	var organizations []models.Organization

	query := s.db.Order("created_at DESC")
	if keyword != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	result := query.Find(&organizations)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to search organizations")
		return nil, result.Error
	}

	log.Info().
		Str("keyword", keyword).
		Int("count", len(organizations)).
		Msg("Organizations searched successfully")

	return organizations, nil
}
