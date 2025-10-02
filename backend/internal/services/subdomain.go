package services

import (
	"fmt"
	"strings"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// SubDomainService 子域名服务
type SubDomainService struct {
	db *gorm.DB
}

// NewSubDomainService 创建子域名服务实例
func NewSubDomainService() *SubDomainService {
	return &SubDomainService{
		db: database.GetDB(),
	}
}

// CreateSubDomains 创建子域名
func (s *SubDomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.APIResponse, error) {
	var createdCount int
	var existingDomains []string

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, subDomainName := range req.SubDomains {
			// 检查子域名是否已存在于该主域名下
			var existingSubDomain models.SubDomain
			result := tx.Where("name = ? AND domain_id = ?", subDomainName, req.DomainID).First(&existingSubDomain)

			if result.Error == gorm.ErrRecordNotFound {
				// 子域名不存在，创建新的
				newSubDomain := models.SubDomain{
					Name:     subDomainName,
					DomainID: req.DomainID,
				}
				if err := tx.Create(&newSubDomain).Error; err != nil {
					log.Error().Err(err).Msg("Failed to create sub domain")
					return err
				}
				createdCount++
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check existing sub domain")
				return result.Error
			} else {
				// 子域名已存在
				existingDomains = append(existingDomains, subDomainName)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	message := fmt.Sprintf("成功创建 %d 个子域名", createdCount)
	if len(existingDomains) > 0 {
		message += fmt.Sprintf("，%d 个子域名已存在: %s", len(existingDomains), strings.Join(existingDomains, ", "))
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"success_count":    createdCount,
			"existing_domains": existingDomains,
			"total_requested":  len(req.SubDomains),
		},
	}

	log.Info().
		Uint("domain_id", req.DomainID).
		Int("success_count", createdCount).
		Int("total_domains", len(req.SubDomains)).
		Msg("Sub domains created successfully")

	return response, nil
}

// GetSubDomainsByDomain 根据域名ID获取所有子域名
func (s *SubDomainService) GetSubDomainsByDomain(domainID uint) ([]models.SubDomain, error) {
	var subDomains []models.SubDomain

	result := s.db.Where("domain_id = ?", domainID).Order("created_at DESC").Find(&subDomains)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query sub domains by main domain")
		return nil, result.Error
	}

	log.Info().
		Uint("domain_id", domainID).
		Int("count", len(subDomains)).
		Msg("Sub domains by domain retrieved successfully")

	return subDomains, nil
}

// DeleteSubDomain 删除子域名
func (s *SubDomainService) DeleteSubDomain(subDomainID string) error {
	result := s.db.Delete(&models.SubDomain{}, "id = ?", subDomainID)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to delete sub domain")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("sub domain not found")
	}

	log.Info().Str("sub_domain_id", subDomainID).Msg("Sub domain deleted successfully")
	return nil
}
