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

// CreateDomains 创建域名并关联到组织（优化版本：批量查询替代N+1查询）
// 支持批量创建域名并关联到组织
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) (*models.APIResponse, error) {
	var createdCount int
	var existingDomains []string
	var associatedCount int

	// 1. 预处理：批量查询所有域名是否存在
	domainNames := make([]string, len(req.Domains))
	for i, detail := range req.Domains {
		domainNames[i] = detail.Name
	}

	// 批量查询存在的域名
	var existingDomainList []models.Domain
	s.db.Where("name IN ?", domainNames).Find(&existingDomainList)

	// 创建域名名称到ID的映射
	domainNameToID := make(map[string]uint)
	for _, domain := range existingDomainList {
		domainNameToID[domain.Name] = domain.ID
	}

	// 2. 预处理：批量查询现有组织-域名关联
	var existingAssociations []models.OrganizationDomain
	if len(existingDomainList) > 0 {
		existingDomainIDs := make([]uint, len(existingDomainList))
		for i, domain := range existingDomainList {
			existingDomainIDs[i] = domain.ID
		}
		s.db.Where("organization_id = ? AND domain_id IN ?", req.OrganizationID, existingDomainIDs).
			Find(&existingAssociations)
	}

	// 创建已关联域名ID的映射
	associatedDomainIDs := make(map[uint]bool)
	for _, assoc := range existingAssociations {
		associatedDomainIDs[assoc.DomainID] = true
	}

	// 3. 在事务中处理创建和关联
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, detail := range req.Domains {
			var domainID uint

			// 检查域名是否存在（使用内存映射）
			if id, exists := domainNameToID[detail.Name]; exists {
				domainID = id
				existingDomains = append(existingDomains, detail.Name)
			} else {
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
			}

			// 检查是否已关联（使用内存映射）
			if associatedDomainIDs[domainID] {
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

// UpdateDomain 更新域名信息
// 支持部分字段更新，只更新请求中提供的非空字段
// 如果更新域名名称，会同时更新input_type字段
// 会检查新域名名称的唯一性，避免重复
// 返回更新后的完整域名信息
func (s *DomainService) UpdateDomain(req models.UpdateDomainRequest) (*models.Domain, error) {
	// 检查域名是否存在
	var domain models.Domain
	result := s.db.First(&domain, "id = ?", req.ID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("domain not found")
		}
		log.Error().Err(result.Error).Msg("Failed to query domain for update")
		return nil, result.Error
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		// 检查新名称是否已被其他域名使用
		var existingDomain models.Domain
		if err := s.db.Where("name = ? AND id != ?", req.Name, req.ID).First(&existingDomain).Error; err == nil {
			return nil, fmt.Errorf("domain name already exists")
		}
		updates["name"] = req.Name
		updates["input_type"] = inferInputType(req.Name)
	}
	if req.H1TeamHandle != "" {
		updates["h1_team_handle"] = req.H1TeamHandle
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.CidrRange != "" {
		updates["cidr_range"] = req.CidrRange
	}

	if len(updates) == 0 {
		return &domain, nil // 没有需要更新的字段
	}

	// 执行更新
	result = s.db.Model(&domain).Updates(updates)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to update domain")
		return nil, result.Error
	}

	// 重新查询更新后的数据
	if err := s.db.First(&domain, "id = ?", req.ID).Error; err != nil {
		log.Error().Err(err).Msg("Failed to re-query updated domain")
		return nil, err
	}

	log.Info().Uint("domain_id", req.ID).Msg("Domain updated successfully")
	return &domain, nil
}

// BatchDeleteDomains 批量删除域名
// 支持同时删除多个域名，使用数据库事务确保操作的原子性
// 会检查每个域名是否存在，对于不存在的域名会记录但不影响其他域名的删除
// 返回操作结果统计信息，包括成功删除的数量和不存在的域名ID列表
func (s *DomainService) BatchDeleteDomains(domainIDs []uint) (*models.APIResponse, error) {
	if len(domainIDs) == 0 {
		return nil, fmt.Errorf("no domain IDs provided")
	}

	var deletedCount int64
	var notFoundIDs []uint

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, domainID := range domainIDs {
			// 检查域名是否存在
			var domain models.Domain
			result := tx.First(&domain, "id = ?", domainID)
			if result.Error != nil {
				if result.Error == gorm.ErrRecordNotFound {
					notFoundIDs = append(notFoundIDs, domainID)
					continue
				}
				log.Error().Err(result.Error).Uint("domain_id", domainID).Msg("Failed to query domain for deletion")
				return result.Error
			}

			// 删除域名（GORM会自动处理级联删除）
			result = tx.Delete(&domain)
			if result.Error != nil {
				log.Error().Err(result.Error).Uint("domain_id", domainID).Msg("Failed to delete domain")
				return result.Error
			}
			deletedCount++
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// 构建响应消息
	var messageParts []string
	if deletedCount > 0 {
		messageParts = append(messageParts, fmt.Sprintf("成功删除 %d 个域名", deletedCount))
	}
	if len(notFoundIDs) > 0 {
		messageParts = append(messageParts, fmt.Sprintf("%d 个域名不存在: %v", len(notFoundIDs), notFoundIDs))
	}

	message := strings.Join(messageParts, "，")
	if message == "" {
		message = "操作完成"
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"deleted_count":   deletedCount,
			"not_found_ids":   notFoundIDs,
			"total_requested": len(domainIDs),
		},
	}

	log.Info().
		Int64("deleted_count", deletedCount).
		Int("not_found_count", len(notFoundIDs)).
		Int("total_requested", len(domainIDs)).
		Msg("Batch domain deletion completed")

	return response, nil
}

// SearchDomains 搜索域名
// 支持根据关键词进行模糊搜索，搜索范围包括域名名称、H1团队句柄和描述字段
// 支持分页查询，默认每页20条记录，最大每页100条记录
// 结果按创建时间倒序排列
// 返回分页结果和统计信息
func (s *DomainService) SearchDomains(req models.SearchDomainsRequest) (*models.SearchDomainsResponse, error) {
	query := s.db.Model(&models.Domain{})

	// 构建搜索条件
	if req.Query != "" {
		query = query.Where("name LIKE ? OR h1_team_handle LIKE ? OR description LIKE ?",
			"%"+req.Query+"%", "%"+req.Query+"%", "%"+req.Query+"%")
	}

	// 获取总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count domains")
		return nil, err
	}

	// 分页参数
	page := req.Page
	if page <= 0 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 20 // 默认每页20条
	}
	if pageSize > 100 {
		pageSize = 100 // 最大每页100条
	}

	offset := (page - 1) * pageSize

	// 查询数据
	var domains []models.Domain
	result := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&domains)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to search domains")
		return nil, result.Error
	}

	// 计算总页数
	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))

	response := &models.SearchDomainsResponse{
		Domains:    domains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	log.Info().
		Str("query", req.Query).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Msg("Domains searched successfully")

	return response, nil
}
