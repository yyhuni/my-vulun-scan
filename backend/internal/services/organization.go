package services

import (
	"fmt"
	"time"

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

// GetOrganizations 获取组织列表(支持分页)
func (s *OrganizationService) GetOrganizations(req models.GetOrganizationsRequest) (*models.GetOrganizationsResponse, error) {
	time.Sleep(2 * time.Second) // 模拟延迟
	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}

	var organizations []models.Organization
	var total int64

	// 查询总数
	if err := s.db.Model(&models.Organization{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count organizations")
		return nil, err
	}

	// 计算总页数
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 分页查询，按更新时间倒序排列（最近更新的在前）
	offset := (req.Page - 1) * req.PageSize
	result := s.db.Order("updated_at DESC").Offset(offset).Limit(req.PageSize).Find(&organizations)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organizations")
		return nil, result.Error
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(organizations)).
		Msg("Organizations retrieved successfully")

	return &models.GetOrganizationsResponse{
		Organizations: organizations,
		Total:         total,
		Page:          req.Page,
		PageSize:      req.PageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetOrganizationByID 根据ID获取组织详细信息
func (s *OrganizationService) GetOrganizationByID(id uint) (*models.Organization, error) {
	time.Sleep(2 * time.Second) // 模拟延迟
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
	time.Sleep(2 * time.Second) // 模拟延迟
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
	time.Sleep(2 * time.Second) // 模拟延迟
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
	time.Sleep(2 * time.Second) // 模拟延迟
	return s.db.Transaction(func(tx *gorm.DB) error {
		var org models.Organization

		// 预加载关联的域名
		if err := tx.Preload("Domains").First(&org, "id = ?", organizationID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("organization not found")
			}
			log.Error().Err(err).Msg("Failed to query organization for deletion")
			return err
		}

		// 收集域名 ID
		domainIDs := make([]uint, len(org.Domains))
		for i, d := range org.Domains {
			domainIDs[i] = d.ID
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

		// 一次性查询孤儿域名(没有任何组织关联的域名)
		if len(domainIDs) > 0 {
			var orphanDomainIDs []uint
			err := tx.Raw(`
				SELECT d.id 
				FROM domains d
				WHERE d.id IN (?) 
				AND NOT EXISTS (
					SELECT 1 FROM organization_domains od 
					WHERE od.domain_id = d.id
				)
			`, domainIDs).Scan(&orphanDomainIDs).Error

			if err != nil {
				log.Error().Err(err).Msg("Failed to query orphan domains")
				return err
			}

			// 批量删除孤儿域名
			if len(orphanDomainIDs) > 0 {
				if err := tx.Delete(&models.Domain{}, orphanDomainIDs).Error; err != nil {
					log.Error().Err(err).Msg("Failed to delete orphan domains")
					return err
				}
				log.Info().Int("count", len(orphanDomainIDs)).Msg("Orphan domains deleted")
			}
		}

		log.Info().Uint("id", organizationID).Msg("Organization deleted successfully")
		return nil
	})
}

// BatchDeleteOrganizations 批量删除组织
func (s *OrganizationService) BatchDeleteOrganizations(organizationIDs []uint) ([]models.Organization, error) {
	time.Sleep(2 * time.Second) // 模拟延迟
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
