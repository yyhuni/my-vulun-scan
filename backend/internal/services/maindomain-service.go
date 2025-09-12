package services

import (
	"fmt"
	"strings"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// MainDomainService 主域名服务
type MainDomainService struct {
	db *gorm.DB
}

// NewMainDomainService 创建主域名服务实例
func NewMainDomainService() *MainDomainService {
	return &MainDomainService{
		db: database.GetDB(),
	}
}

// GetOrganizationMainDomains 获取组织的主域名
func (s *MainDomainService) GetOrganizationMainDomains(organizationID string) ([]models.MainDomain, error) {
	var mainDomains []models.MainDomain

	result := s.db.
		Joins("JOIN organization_main_domains ON main_domains.id = organization_main_domains.main_domain_id").
		Where("organization_main_domains.organization_id = ?", organizationID).
		Order("main_domains.created_at DESC").
		Find(&mainDomains)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organization main domains")
		return nil, result.Error
	}

	log.Info().
		Str("organization_id", organizationID).
		Int("count", len(mainDomains)).
		Msg("Organization main domains retrieved successfully")

	return mainDomains, nil
}

// CreateMainDomains 创建主域名并关联到组织
func (s *MainDomainService) CreateMainDomains(req models.CreateMainDomainsRequest) (*models.APIResponse, error) {
	var createdCount int
	var existingDomains []string

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, domainName := range req.MainDomains {
			// 检查主域名是否已存在
			var existingDomain models.MainDomain
			result := tx.Where("main_domain_name = ?", domainName).First(&existingDomain)

			var domainID string
			if result.Error == gorm.ErrRecordNotFound {
				// 主域名不存在，创建新的
				newDomain := models.MainDomain{
					MainDomainName: domainName,
				}
				if err := tx.Create(&newDomain).Error; err != nil {
					log.Error().Err(err).Msg("Failed to create main domain")
					return err
				}
				domainID = newDomain.ID
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check existing main domain")
				return result.Error
			} else {
				// 主域名已存在
				domainID = existingDomain.ID
			}

			// 检查组织是否已关联此主域名
			var association models.OrganizationMainDomain
			result = tx.Where("organization_id = ? AND main_domain_id = ?", req.OrganizationID, domainID).First(&association)

			if result.Error == gorm.ErrRecordNotFound {
				// 创建组织和主域名的关联
				newAssociation := models.OrganizationMainDomain{
					OrganizationID: req.OrganizationID,
					MainDomainID:   domainID,
				}
				if err := tx.Create(&newAssociation).Error; err != nil {
					log.Error().Err(err).Msg("Failed to associate main domain with organization")
					return err
				}
				createdCount++
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check domain association")
				return result.Error
			} else {
				existingDomains = append(existingDomains, domainName)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	message := fmt.Sprintf("成功创建 %d 个主域名关联", createdCount)
	if len(existingDomains) > 0 {
		message += fmt.Sprintf("，%d 个域名已存在: %s", len(existingDomains), strings.Join(existingDomains, ", "))
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"success_count":    createdCount,
			"existing_domains": existingDomains,
			"total_requested":  len(req.MainDomains),
		},
	}

	log.Info().
		Str("organization_id", req.OrganizationID).
		Int("success_count", createdCount).
		Int("total_domains", len(req.MainDomains)).
		Msg("Main domains created and associated successfully")

	return response, nil
}

// RemoveOrganizationMainDomain 移除组织和主域名的关联
func (s *MainDomainService) RemoveOrganizationMainDomain(req models.RemoveOrganizationMainDomainRequest) error {
	result := s.db.Where("organization_id = ? AND main_domain_id = ?", req.OrganizationID, req.MainDomainID).
		Delete(&models.OrganizationMainDomain{})

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to remove organization main domain association")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	log.Info().
		Str("organization_id", req.OrganizationID).
		Str("main_domain_id", req.MainDomainID).
		Msg("Organization main domain association removed successfully")

	return nil
}

// GetMainDomainByID 根据ID获取主域名
func (s *MainDomainService) GetMainDomainByID(id string) (*models.MainDomain, error) {
	var mainDomain models.MainDomain

	result := s.db.Preload("SubDomains").First(&mainDomain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("main domain not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query main domain")
		return nil, result.Error
	}

	log.Info().Str("id", id).Msg("Main domain retrieved successfully")
	return &mainDomain, nil
}

// DeleteMainDomain 删除主域名（级联删除子域名和关联）
func (s *MainDomainService) DeleteMainDomain(mainDomainID string) error {
	// 检查主域名是否存在
	var mainDomain models.MainDomain
	result := s.db.First(&mainDomain, "id = ?", mainDomainID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return fmt.Errorf("main domain not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query main domain for deletion")
		return result.Error
	}

	// 删除主域名（GORM会自动处理级联删除）
	result = s.db.Delete(&mainDomain)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to delete main domain")
		return result.Error
	}

	log.Info().Str("main_domain_id", mainDomainID).Msg("Main domain deleted successfully")
	return nil
}
