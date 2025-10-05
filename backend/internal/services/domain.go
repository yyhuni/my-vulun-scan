package services

import (
	"fmt"
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

// CreateDomains 创建domain并关联到organization
// 支持批量创建domain并关联到organization
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) (*models.APIResponse, error) {
	var createdCount int
	var existingDomains []string
	var associatedCount int

	// 1. 预处理：批量查询所有domain是否存在
	reqDomainNames := make([]string, len(req.Domains))
	for i, detail := range req.Domains {
		reqDomainNames[i] = detail.Name
	}

	// 批量查询存在的domain
	var existingDomainList []models.Domain
	s.db.Where("name IN ?", reqDomainNames).Find(&existingDomainList)

	// 创建domainName到domainID的映射，用于检查domain是否已存在
	domainNameToID := make(map[string]uint)
	for _, domain := range existingDomainList {
		domainNameToID[domain.Name] = domain.ID
	}

	// 2. 预处理：批量查询现有organization-domain关联，用于检查是否已关联
	var existingAssociations []models.OrganizationDomain
	if len(existingDomainList) > 0 {
		existingDomainIDs := make([]uint, len(existingDomainList))
		for i, domain := range existingDomainList {
			existingDomainIDs[i] = domain.ID
		}
		s.db.Where("organization_id = ? AND domain_id IN ?", req.OrganizationID, existingDomainIDs).
			Find(&existingAssociations)
	}

	// 创建已关联domainID的映射，用于检查是否已关联
	linkedDomainIDs := make(map[uint]bool)
	for _, assoc := range existingAssociations {
		linkedDomainIDs[assoc.DomainID] = true
	}

	// 3. 在事务中处理创建和关联domain，使用批量查询替代N+1查询
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, detail := range req.Domains {
			var domainID uint

			// 检查domain是否存在（使用内存映射，提高查询性能）
			if id, exists := domainNameToID[detail.Name]; exists {
				domainID = id
				existingDomains = append(existingDomains, detail.Name)
			} else {
				// domain不存在，创建新的
				newDomain := models.Domain{
					Name:        detail.Name,
					Description: detail.Description,
				}

				if err := tx.Create(&newDomain).Error; err != nil {
					log.Error().Err(err).
						Str("domain_name", detail.Name).
						Msg("Failed to create domain")
					return err
				}
				domainID = newDomain.ID
				createdCount++
			}

			// 检查是否已关联（使用内存映射）
			if linkedDomainIDs[domainID] {
				// 域名已存在且已关联，无需处理
				continue
			} else {
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

