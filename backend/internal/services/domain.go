package services

import (
	"fmt"
	"net"
	"strings"

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

// GetOrganizationDomains 获取组织的域名
func (s *DomainService) GetOrganizationDomains(organizationID uint) ([]models.Domain, error) {
	var domains []models.Domain

	result := s.db.
		Joins("JOIN organization_domains ON domains.id = organization_domains.domain_id").
		Where("organization_domains.organization_id = ?", organizationID).
		Order("domains.created_at DESC").
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organization domains")
		return nil, result.Error
	}

	log.Info().
		Uint("organization_id", organizationID).
		Int("count", len(domains)).
		Msg("Organization domains retrieved successfully")

	return domains, nil
}

// inferInputType 推断输入类型
func inferInputType(name string) string {
	// 检查是否为 CIDR 格式
	if strings.Contains(name, "/") {
		return "cidr"
	}

	// 检查是否为 IP 地址
	if net.ParseIP(name) != nil {
		return "ip"
	}

	// 默认为域名
	return "domain"
}

// CreateDomains 创建域名并关联到组织
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) (*models.APIResponse, error) {
	var createdCount int
	var existingDomains []string
	var associatedCount int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, detail := range req.Domains {
			// 检查域名是否已存在
			var existingDomain models.Domain
			result := tx.Where("name = ?", detail.Name).First(&existingDomain)

			var domainID uint
			if result.Error == gorm.ErrRecordNotFound {
				// 域名不存在，创建新的
				inputType := inferInputType(detail.Name)
				newDomain := models.Domain{
					Name:         detail.Name,
					H1TeamHandle: detail.H1TeamHandle,
					Description:  detail.Description,
					CidrRange:    detail.CidrRange,
					InputType:    inputType,
				}

				// 如果是 CIDR 类型但没有明确指定 CidrRange，使用 Name 作为 CidrRange
				if inputType == "cidr" && detail.CidrRange == "" {
					newDomain.CidrRange = detail.Name
				}

				if err := tx.Create(&newDomain).Error; err != nil {
					log.Error().Err(err).
						Str("domain_name", detail.Name).
						Msg("Failed to create domain")
					return err
				}
				domainID = newDomain.ID
				createdCount++
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check existing domain")
				return result.Error
			} else {
				// 域名已存在
				domainID = existingDomain.ID
				existingDomains = append(existingDomains, detail.Name)
			}

			// 检查组织是否已关联此域名
			var association models.OrganizationDomain
			result = tx.Where("organization_id = ? AND domain_id = ?", req.OrganizationID, domainID).First(&association)

			if result.Error == gorm.ErrRecordNotFound {
				// 创建组织和域名的关联
				newAssociation := models.OrganizationDomain{
					OrganizationID: req.OrganizationID,
					DomainID:       domainID,
				}
				if err := tx.Create(&newAssociation).Error; err != nil {
					log.Error().Err(err).
						Uint("organization_id", req.OrganizationID).
						Uint("domain_id", domainID).
						Msg("Failed to associate domain with organization")
					return err
				}
				associatedCount++
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check domain association")
				return result.Error
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// 构建响应消息
	var messageParts []string
	if createdCount > 0 {
		messageParts = append(messageParts, fmt.Sprintf("成功创建 %d 个域名", createdCount))
	}
	if associatedCount > 0 {
		messageParts = append(messageParts, fmt.Sprintf("成功关联 %d 个域名", associatedCount))
	}
	if len(existingDomains) > 0 {
		messageParts = append(messageParts, fmt.Sprintf("%d 个域名已存在: %s", len(existingDomains), strings.Join(existingDomains, ", ")))
	}

	message := strings.Join(messageParts, "，")
	if message == "" {
		message = "操作完成"
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"created_count":    createdCount,
			"associated_count": associatedCount,
			"existing_domains": existingDomains,
			"total_requested":  len(req.Domains),
		},
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Int("created_count", createdCount).
		Int("associated_count", associatedCount).
		Int("total_domains", len(req.Domains)).
		Msg("Domains created and associated successfully")

	return response, nil
}

// RemoveOrganizationDomain 移除组织和域名的关联
func (s *DomainService) RemoveOrganizationDomain(req models.RemoveOrganizationDomainRequest) error {
	result := s.db.Where("organization_id = ? AND domain_id = ?", req.OrganizationID, req.DomainID).
		Delete(&models.OrganizationDomain{})

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to remove organization domain association")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Uint("domain_id", req.DomainID).
		Msg("Organization domain association removed successfully")

	return nil
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

// DeleteDomain 删除域名（级联删除子域名和关联）
func (s *DomainService) DeleteDomain(domainID uint) error {
	// 检查域名是否存在
	var domain models.Domain
	result := s.db.First(&domain, "id = ?", domainID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return fmt.Errorf("domain not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query domain for deletion")
		return result.Error
	}

	// 删除域名（GORM会自动处理级联删除）
	result = s.db.Delete(&domain)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to delete domain")
		return result.Error
	}

	log.Info().Uint("domain_id", domainID).Msg("Domain deleted successfully")
	return nil
}
