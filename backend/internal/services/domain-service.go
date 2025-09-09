package services

import (
	"fmt"
	"strings"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/sirupsen/logrus"
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

// GetOrganizationMainDomains 获取组织的主域名
func (s *DomainService) GetOrganizationMainDomains(organizationID string) ([]models.MainDomain, error) {
	var mainDomains []models.MainDomain

	result := s.db.
		Joins("JOIN organization_main_domains ON main_domains.id = organization_main_domains.main_domain_id").
		Where("organization_main_domains.organization_id = ?", organizationID).
		Order("main_domains.created_at DESC").
		Find(&mainDomains)

	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to query organization main domains")
		return nil, result.Error
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": organizationID,
		"count":           len(mainDomains),
	}).Info("Organization main domains retrieved successfully")

	return mainDomains, nil
}

// CreateMainDomains 创建主域名并关联到组织
func (s *DomainService) CreateMainDomains(req models.CreateMainDomainsRequest) (*models.APIResponse, error) {
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
					logrus.WithError(err).Error("Failed to create main domain")
					return err
				}
				domainID = newDomain.ID
			} else if result.Error != nil {
				logrus.WithError(result.Error).Error("Failed to check existing main domain")
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
					logrus.WithError(err).Error("Failed to associate main domain with organization")
					return err
				}
				createdCount++
			} else if result.Error != nil {
				logrus.WithError(result.Error).Error("Failed to check domain association")
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

	logrus.WithFields(logrus.Fields{
		"organization_id": req.OrganizationID,
		"success_count":   createdCount,
		"total_domains":   len(req.MainDomains),
	}).Info("Main domains created and associated successfully")

	return response, nil
}

// RemoveOrganizationMainDomain 移除组织和主域名的关联
func (s *DomainService) RemoveOrganizationMainDomain(req models.RemoveOrganizationMainDomainRequest) error {
	result := s.db.Where("organization_id = ? AND main_domain_id = ?", req.OrganizationID, req.MainDomainID).
		Delete(&models.OrganizationMainDomain{})

	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to remove organization main domain association")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": req.OrganizationID,
		"main_domain_id":  req.MainDomainID,
	}).Info("Organization main domain association removed successfully")

	return nil
}

// GetOrganizationSubDomains 获取组织的子域名（分页）
func (s *DomainService) GetOrganizationSubDomains(organizationID string, page, pageSize int) (*models.GetOrganizationSubDomainsResponse, error) {
	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取总数
	var total int64
	err := s.db.Table("sub_domains sd").
		Joins("JOIN main_domains md ON sd.main_domain_id = md.id").
		Joins("JOIN organization_main_domains omd ON md.id = omd.main_domain_id").
		Where("omd.organization_id = ?", organizationID).
		Count(&total).Error

	if err != nil {
		logrus.WithError(err).Error("Failed to count organization sub domains")
		return nil, err
	}

	// 获取分页数据
	var subDomains []models.SubDomain
	result := s.db.
		Preload("MainDomain").
		Joins("JOIN main_domains md ON sub_domains.main_domain_id = md.id").
		Joins("JOIN organization_main_domains omd ON md.id = omd.main_domain_id").
		Where("omd.organization_id = ?", organizationID).
		Order("sub_domains.created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&subDomains)

	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to query organization sub domains")
		return nil, result.Error
	}

	response := &models.GetOrganizationSubDomainsResponse{
		SubDomains: subDomains,
		Total:      int(total),
		Page:       page,
		PageSize:   pageSize,
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": organizationID,
		"total":           total,
		"page":            page,
		"page_size":       pageSize,
	}).Info("Organization sub domains retrieved successfully")

	return response, nil
}

// CreateSubDomains 创建子域名
func (s *DomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.APIResponse, error) {
	if req.Status == "" {
		req.Status = "unknown"
	}

	var createdCount int
	var existingDomains []string

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, subDomainName := range req.SubDomains {
			// 检查子域名是否已存在于该主域名下
			var existingSubDomain models.SubDomain
			result := tx.Where("sub_domain_name = ? AND main_domain_id = ?", subDomainName, req.MainDomainID).First(&existingSubDomain)

			if result.Error == gorm.ErrRecordNotFound {
				// 子域名不存在，创建新的
				newSubDomain := models.SubDomain{
					SubDomainName: subDomainName,
					MainDomainID:  req.MainDomainID,
					Status:        req.Status,
				}
				if err := tx.Create(&newSubDomain).Error; err != nil {
					logrus.WithError(err).Error("Failed to create sub domain")
					return err
				}
				createdCount++
			} else if result.Error != nil {
				logrus.WithError(result.Error).Error("Failed to check existing sub domain")
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

	logrus.WithFields(logrus.Fields{
		"main_domain_id": req.MainDomainID,
		"success_count":  createdCount,
		"total_domains":  len(req.SubDomains),
	}).Info("Sub domains created successfully")

	return response, nil
}

// GetMainDomainByID 根据ID获取主域名
func (s *DomainService) GetMainDomainByID(id string) (*models.MainDomain, error) {
	var mainDomain models.MainDomain

	result := s.db.Preload("SubDomains").First(&mainDomain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("main domain not found")
		}
		logrus.WithError(result.Error).Error("Failed to query main domain")
		return nil, result.Error
	}

	logrus.WithField("id", id).Info("Main domain retrieved successfully")
	return &mainDomain, nil
}

// GetSubDomainsByMainDomain 根据主域名ID获取所有子域名
func (s *DomainService) GetSubDomainsByMainDomain(mainDomainID string) ([]models.SubDomain, error) {
	var subDomains []models.SubDomain

	result := s.db.Where("main_domain_id = ?", mainDomainID).Order("created_at DESC").Find(&subDomains)
	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to query sub domains by main domain")
		return nil, result.Error
	}

	logrus.WithFields(logrus.Fields{
		"main_domain_id": mainDomainID,
		"count":          len(subDomains),
	}).Info("Sub domains by main domain retrieved successfully")

	return subDomains, nil
}

// DeleteMainDomain 删除主域名（级联删除子域名和关联）
func (s *DomainService) DeleteMainDomain(mainDomainID string) error {
	// 检查主域名是否存在
	var mainDomain models.MainDomain
	result := s.db.First(&mainDomain, "id = ?", mainDomainID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return fmt.Errorf("main domain not found")
		}
		logrus.WithError(result.Error).Error("Failed to query main domain for deletion")
		return result.Error
	}

	// 删除主域名（GORM会自动处理级联删除）
	result = s.db.Delete(&mainDomain)
	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to delete main domain")
		return result.Error
	}

	logrus.WithField("main_domain_id", mainDomainID).Info("Main domain deleted successfully")
	return nil
}

// DeleteSubDomain 删除子域名
func (s *DomainService) DeleteSubDomain(subDomainID string) error {
	result := s.db.Delete(&models.SubDomain{}, "id = ?", subDomainID)
	if result.Error != nil {
		logrus.WithError(result.Error).Error("Failed to delete sub domain")
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("sub domain not found")
	}

	logrus.WithField("sub_domain_id", subDomainID).Info("Sub domain deleted successfully")
	return nil
}
