package services

import (
	"fmt"

	"vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/utils"
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

// GetSubDomains 获取所有子域名列表
func (s *SubDomainService) GetSubDomains(page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{})

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count all sub domains")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	
	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}
	
	orderClause := fmt.Sprintf("%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query all sub domains")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("All sub domains retrieved successfully")

	return response, nil
}

// GetSubDomainsByDomainID 根据域名ID获取子域名列表
func (s *SubDomainService) GetSubDomainsByDomainID(domainID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{}).Where("domain_id = ?", domainID)

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to count sub domains by domain")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	
	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}
	
	orderClause := fmt.Sprintf("%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to query sub domains by domain")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Uint("domain_id", domainID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("Sub domains by domain retrieved successfully")

	return response, nil
}

// GetSubDomainsByOrgID 根据组织ID获取子域名列表
func (s *SubDomainService) GetSubDomainsByOrgID(orgID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	// 通过多表JOIN查询组织的所有子域名
	query := s.db.Model(&models.SubDomain{}).
		Joins("JOIN domains ON sub_domains.domain_id = domains.id").
		Joins("JOIN organization_domains ON domains.id = organization_domains.domain_id").
		Where("organization_domains.organization_id = ?", orgID)

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("org_id", orgID).Msg("Failed to count sub domains by organization")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}
	
	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}
	
	orderClause := fmt.Sprintf("sub_domains.%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Uint("org_id", orgID).Msg("Failed to query sub domains by organization")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Uint("org_id", orgID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("Sub domains by organization retrieved successfully")

	return response, nil
}

// CreateSubDomains 批量创建子域名
//
// 业务逻辑说明：
// 1. 在事务中批量创建子域名
// 2. 对于每个子域名：
//    a. 检查是否已存在于该主域名下（基于 name + domain_id 去重）
//    b. 如果不存在，创建新的子域名记录
//    c. 如果已存在，记录到 existingDomains 列表
// 3. 返回创建统计信息
//
// 去重逻辑：
// - 子域名的唯一性基于：name + domain_id 组合
// - 同一个子域名可以存在于不同的主域名下
// - 例如：admin.example.com 和 admin.test.com 可以同时存在
//
// 设计考虑：
// - 使用事务确保批量创建的原子性
// - 支持幂等性：重复提交已存在的子域名不会报错，只会跳过
// - 返回详细的创建统计，方便前端展示结果
//
// 返回信息：
// - SuccessCount: 成功创建的子域名数量
// - ExistingDomains: 已存在的子域名列表
// - TotalRequested: 请求创建的总数
//
// 使用场景：
// - 主域名详情页：批量添加子域名
// - 导入功能：从文件批量导入子域名
func (s *SubDomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.CreateSubDomainsResponse, error) {

	// 步骤1: 验证子域名格式
	if validationErrors := utils.ValidateSubdomains(req.SubDomains); len(validationErrors) > 0 {
		// 记录第一个验证错误
		log.Error().Err(validationErrors[0]).Msg("Subdomain validation failed")
		return nil, fmt.Errorf("子域名格式验证失败: %v", validationErrors[0])
	}

	var createdCount int
	var existingDomains []string

	// 步骤2: 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤2.1: 一次性查询所有已存在的子域名（批量查询，避免 N+1 问题）
		var existingSubDomains []models.SubDomain
		if err := tx.Where("name IN ? AND domain_id = ?", req.SubDomains, req.DomainID).
			Find(&existingSubDomains).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query existing sub domains")
			return err
		}

		// 步骤2.2: 构建已存在子域名的 map（O(1) 查找性能）
		existingMap := make(map[string]bool)
		for _, sd := range existingSubDomains {
			existingMap[sd.Name] = true
			existingDomains = append(existingDomains, sd.Name)
		}

		// 步骤2.3: 过滤出需要创建的子域名
		var newSubDomains []models.SubDomain
		for _, name := range req.SubDomains {
			if !existingMap[name] {
				newSubDomains = append(newSubDomains, models.SubDomain{
					Name:     name,
					DomainID: req.DomainID,
				})
			}
		}

		// 步骤2.4: 批量插入新子域名
		if len(newSubDomains) > 0 {
			if err := tx.Create(&newSubDomains).Error; err != nil {
				log.Error().Err(err).Msg("Failed to batch create sub domains")
				return err
			}
			createdCount = len(newSubDomains)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	response := &models.CreateSubDomainsResponse{
		SuccessCount:    createdCount,
		ExistingDomains: existingDomains,
		TotalRequested:  len(req.SubDomains),
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

// GetSubDomainByID 根据ID获取子域名详情
func (s *SubDomainService) GetSubDomainByID(id uint) (*models.SubDomain, error) {

	var subDomain models.SubDomain
	result := s.db.Preload("Domain").First(&subDomain, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Warn().Uint("id", id).Msg("Sub domain not found")
			return nil, errors.ErrSubDomainNotFound
		}
		log.Error().Err(result.Error).Uint("id", id).Msg("Failed to get sub domain by ID")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Str("name", subDomain.Name).Msg("Sub domain retrieved successfully")
	return &subDomain, nil
}
