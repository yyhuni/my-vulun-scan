package services

import (
	"fmt"

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

// GetDomainsByOrgID 根据组织ID获取域名列表
func (s *DomainService) GetDomainsByOrgID(organizationID uint) ([]models.Domain, error) {
	// 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", organizationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", organizationID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	var domains []models.Domain

	// 通过中间表查询该组织的所有域名
	result := s.db.
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", organizationID).
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).
			Uint("organization_id", organizationID).
			Msg("Failed to query domains by organization ID")
		return nil, result.Error
	}

	log.Info().
		Uint("organization_id", organizationID).
		Int("count", len(domains)).
		Msg("Domains retrieved successfully")

	return domains, nil
}
