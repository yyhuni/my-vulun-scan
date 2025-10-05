package services

import (
	"fmt"
	"time"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// DomainService 域名服务
type DomainService struct {
	db *gorm.DB
}

// NewDomainService 创建域名服务实例
func NewDomainService() *DomainService {
	return &DomainService{
		db: database.GetDB(),
	}
}

// CreateDomains 批量创建域名并关联到组织
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) ([]models.Domain, error) {
	time.Sleep(2 * time.Second) // 模拟延迟

	var createdDomains []models.Domain

	// 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	// 在事务中处理创建和关联
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, detail := range req.Domains {
			var domain models.Domain

			// 检查域名是否已存在
			result := tx.Where("name = ?", detail.Name).First(&domain)
			if result.Error != nil {
				if result.Error == gorm.ErrRecordNotFound {
					// 域名不存在，创建新的
					domain = models.Domain{
						Name:        detail.Name,
						Description: detail.Description,
					}
					if err := tx.Create(&domain).Error; err != nil {
						log.Error().Err(err).
							Str("domain_name", detail.Name).
							Msg("Failed to create domain")
						return err
					}
					log.Info().
						Uint("id", domain.ID).
						Str("name", domain.Name).
						Msg("Domain created successfully")
				} else {
					log.Error().Err(result.Error).Msg("Failed to query domain")
					return result.Error
				}
			}

			// 检查是否已关联到该组织
			var existingAssoc models.OrganizationDomain
			assocResult := tx.Where("organization_id = ? AND domain_id = ?", req.OrganizationID, domain.ID).
				First(&existingAssoc)

			if assocResult.Error != nil {
				if assocResult.Error == gorm.ErrRecordNotFound {
					// 未关联，创建关联
					newAssociation := models.OrganizationDomain{
						OrganizationID: req.OrganizationID,
						DomainID:       domain.ID,
					}
					if err := tx.Create(&newAssociation).Error; err != nil {
						log.Error().Err(err).
							Uint("organization_id", req.OrganizationID).
							Uint("domain_id", domain.ID).
							Msg("Failed to associate domain with organization")
						return err
					}
					log.Info().
						Uint("organization_id", req.OrganizationID).
						Uint("domain_id", domain.ID).
						Msg("Domain associated with organization successfully")
				} else {
					log.Error().Err(assocResult.Error).Msg("Failed to query association")
					return assocResult.Error
				}
			}

			// 添加到结果列表
			createdDomains = append(createdDomains, domain)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Int("total_domains", len(createdDomains)).
		Msg("Domains created and associated successfully")

	return createdDomains, nil
}

// GetDomainByID 根据ID获取域名
func (s *DomainService) GetDomainByID(id uint) (*models.Domain, error) {
	time.Sleep(2 * time.Second) // 模拟延迟
	var domain models.Domain

	result := s.db.Preload("SubDomains").First(&domain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("domain not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query domain")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Domain retrieved successfully")
	return &domain, nil
}

// GetDomainsByOrgID 根据组织ID获取域名列表(支持分页和排序)
func (s *DomainService) GetDomainsByOrgID(req models.GetOrganizationDomainsRequest) (*models.GetOrganizationDomainsResponse, error) {
	time.Sleep(2 * time.Second) // 模拟延迟

	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	// 设置默认排序
	if req.SortBy == "" {
		req.SortBy = "updated_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	// 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	var domains []models.Domain
	var total int64

	// 查询总数
	if err := s.db.Model(&models.Domain{}).
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrganizationID).
		Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count domains")
		return nil, err
	}

	// 计算总页数
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建排序字符串
	orderClause := s.buildOrderClause(req.SortBy, req.SortOrder)

	// 分页查询，支持动态排序
	offset := (req.Page - 1) * req.PageSize
	result := s.db.
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrganizationID).
		Order(orderClause).
		Offset(offset).
		Limit(req.PageSize).
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).
			Uint("organization_id", req.OrganizationID).
			Msg("Failed to query domains by organization ID")
		return nil, result.Error
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(domains)).
		Msg("Domains retrieved successfully")

	return &models.GetOrganizationDomainsResponse{
		Domains:    domains,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}, nil
}

// buildOrderClause 构建排序子句
func (s *DomainService) buildOrderClause(sortBy, sortOrder string) string {
	// 验证排序字段
	validSortFields := map[string]bool{
		"name":       true,
		"created_at": true,
		"updated_at": true,
	}
	if !validSortFields[sortBy] {
		sortBy = "updated_at"
	}

	// 验证排序方向
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	return fmt.Sprintf("domains.%s %s", sortBy, sortOrder)
}

// RemoveOrganizationDomain 解除组织与域名的关联，如果域名成为孤儿则删除
func (s *DomainService) RemoveOrganizationDomain(req models.RemoveOrganizationDomainRequest) error {
	time.Sleep(2 * time.Second) // 模拟延迟

	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 验证组织是否存在
		var org models.Organization
		if err := tx.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
				return fmt.Errorf("organization not found")
			}
			log.Error().Err(err).Msg("Failed to query organization")
			return err
		}

		// 2. 验证域名是否存在
		var domain models.Domain
		if err := tx.First(&domain, "id = ?", req.DomainID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("domain_id", req.DomainID).Msg("Domain not found")
				return fmt.Errorf("domain not found")
			}
			log.Error().Err(err).Msg("Failed to query domain")
			return err
		}

		// 3. 验证关联是否存在
		var count int64
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("organization_id = ? AND domain_id = ?", req.OrganizationID, req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query association")
			return err
		}

		if count == 0 {
			log.Error().
				Uint("organization_id", req.OrganizationID).
				Uint("domain_id", req.DomainID).
				Msg("Association not found")
			return fmt.Errorf("association not found")
		}

		// 4. 使用 Association 方法删除关联
		if err := tx.Model(&org).Association("Domains").Delete(&domain); err != nil {
			log.Error().Err(err).Msg("Failed to delete association")
			return err
		}

		log.Info().
			Uint("organization_id", req.OrganizationID).
			Uint("domain_id", req.DomainID).
			Msg("Association removed successfully")

		// 5. 检查域名是否成为孤儿（没有任何组织关联）
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("domain_id = ?", req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count domain associations")
			return err
		}

		// 6. 如果是孤儿域名，则删除
		if count == 0 {
			if err := tx.Delete(&domain).Error; err != nil {
				log.Error().Err(err).Msg("Failed to delete orphan domain")
				return err
			}
			log.Info().
				Uint("domain_id", req.DomainID).
				Str("domain_name", domain.Name).
				Msg("Orphan domain deleted")
		}

		return nil
	})
}
