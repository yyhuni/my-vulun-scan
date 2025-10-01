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
		Uint("id", org.ID).
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
		Uint("id", org.ID).
		Str("name", org.Name).
		Msg("Organization updated successfully")

	return &org, nil
}

// DeleteOrganization 删除组织
func (s *OrganizationService) DeleteOrganization(organizationID string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 检查组织是否存在
		var org models.Organization
		if err := tx.First(&org, "id = ?", organizationID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("organization not found")
			}
			log.Error().Err(err).Msg("Failed to query organization for deletion")
			return err
		}

		// 删除组织（如配置了外键级联，GORM/DB 将自动处理关联删除）
		res := tx.Delete(&org)
		if res.Error != nil {
			log.Error().Err(res.Error).Msg("Failed to delete organization")
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("no rows affected during deletion")
		}

		log.Info().Str("id", organizationID).Msg("Organization deleted successfully")
		return nil
	})
}
