package services

import (
	"fmt"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

	result := s.db.Find(&organizations)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organizations")
		return nil, result.Error
	}

	log.Info().Int("count", len(organizations)).Msg("Organizations retrieved successfully")
	return organizations, nil
}

// GetOrganizationByID 根据ID获取组织详细信息
func (s *OrganizationService) GetOrganizationByID(id uint) (*models.Organization, error) {
	var org models.Organization

	result := s.db.First(&org, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("organization not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query organization")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Organization retrieved successfully")
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
func (s *OrganizationService) DeleteOrganization(organizationID uint) error {
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

		// 使用 Select(clause.Associations) 自动清理所有关联
		// 这会自动识别并清理模型中的所有关联字段（如 Domains 等）
		// 无需手动逐个 Association().Clear()，代码更简洁且易于维护
		res := tx.Select(clause.Associations).Delete(&org)
		if res.Error != nil {
			log.Error().Err(res.Error).Msg("Failed to delete organization")
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("no rows affected during deletion")
		}

		log.Info().Uint("id", organizationID).Msg("Organization and associations deleted successfully")
		return nil
	})
}

// BatchDeleteOrganizations 批量删除组织
func (s *OrganizationService) BatchDeleteOrganizations(organizationIDs []uint) ([]models.Organization, error) {
	if len(organizationIDs) == 0 {
		return nil, fmt.Errorf("no organization IDs provided")
	}

	var deletedOrgs []models.Organization

	// 验证所有组织ID都存在
	if err := s.db.Where("id IN ?", organizationIDs).Find(&deletedOrgs).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query organizations for batch deletion")
		return nil, err
	}

	if len(deletedOrgs) != len(organizationIDs) {
		return nil, fmt.Errorf("some organization IDs do not exist")
	}

	// 删除组织（数据库 CASCADE 会自动删除 organization_domains 关联表记录）
	if err := s.db.Where("id IN ?", organizationIDs).Delete(&models.Organization{}).Error; err != nil {
		log.Error().Err(err).Msg("Failed to batch delete organizations")
		return nil, err
	}

	log.Info().
		Int("count", len(organizationIDs)).
		Msg("Organizations batch deleted successfully")

	return deletedOrgs, nil
}
