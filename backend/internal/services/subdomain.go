package services

import (
	"fmt"
	"strings"

	"vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

// batchInsertSubdomains 批量插入子域名
//
// 功能说明：
// 使用事务批量插入子域名到数据库，每批处理1000条记录
// 使用 OnConflict{DoNothing: true} 策略，如果记录已存在则跳过（幂等性保证）
//
// 性能优化：
// - 使用数据库事务，保证原子性
// - 分批插入，避免单次插入数据量过大
// - 每批1000条记录，在性能和内存占用之间取得平衡
//
// 参数：
//   - subdomainsToInsert: 需要插入的子域名数组
//
// 返回：
//   - int64: 实际插入的记录数量
//   - error: 如果事务执行失败则返回错误
func (s *SubDomainService) batchInsertSubdomains(subdomainsToInsert []models.SubDomain) (int64, error) {
	var totalRowsInserted int64
	const batchSize = 1000 // 每批插入1000条记录

	// 使用事务确保原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 分批处理，避免单次插入数据量过大
		for i := 0; i < len(subdomainsToInsert); i += batchSize {
			// 计算当前批次的结束索引
			endIndex := i + batchSize
			if endIndex > len(subdomainsToInsert) {
				endIndex = len(subdomainsToInsert)
			}

			// 获取当前批次的数据
			batch := subdomainsToInsert[i:endIndex]
			
			// 批量插入，如果记录已存在则跳过（OnConflict{DoNothing}）
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&batch)
			if result.Error != nil {
				return result.Error // 事务会自动回滚
			}
			
			// 累加实际插入的记录数
			totalRowsInserted += result.RowsAffected
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	// 记录插入结果
	log.Info().
		Int("total_to_insert", len(subdomainsToInsert)).
		Int64("actually_inserted", totalRowsInserted).
		Msg("批量插入子域名完成")

	return totalRowsInserted, nil
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

// BatchDeleteSubDomains 批量删除子域名
//
// 功能说明：
// 批量删除多个子域名，通过事务保证原子性
//
// 处理流程：
// 1. 验证所有子域名是否存在
// 2. 预加载子域名及其关联的域名信息
// 3. 批量删除子域名（GORM会自动级联删除关联的Endpoints和Vulnerabilities）
//
// 事务保证：
// - 所有子域名的删除要么全部成功，要么全部失败
// - 如果任何一个子域名删除失败，整个批量操作回滚
//
// 参数：
//   - subdomainIDs: 需要删除的子域名ID列表
//
// 返回：
//   - []models.SubDomain: 被删除的子域名列表（供前端确认）
//   - error: 如果验证失败或删除失败则返回错误
func (s *SubDomainService) BatchDeleteSubDomains(subdomainIDs []uint) ([]models.SubDomain, error) {
	if len(subdomainIDs) == 0 {
		return nil, fmt.Errorf("子域名ID列表不能为空")
	}

	var deletedSubDomains []models.SubDomain

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 验证所有子域名是否存在
		if err := tx.Where("id IN ?", subdomainIDs).Find(&deletedSubDomains).Error; err != nil {
			log.Error().Err(err).Msg("查询待删除子域名失败")
			return err
		}

		// 检查删除的子域名数量是否与请求的ID数量一致
		if len(deletedSubDomains) != len(subdomainIDs) {
			log.Warn().
				Int("requested", len(subdomainIDs)).
				Int("found", len(deletedSubDomains)).
				Msg("部分子域名ID不存在")
			return fmt.Errorf("部分子域名ID不存在")
		}

		// 步骤2: 批量删除子域名
		// 数据库已配置 CASCADE，会自动删除关联的 Endpoints 和 Vulnerabilities
		if err := tx.Where("id IN ?", subdomainIDs).Delete(&models.SubDomain{}).Error; err != nil {
			log.Error().Err(err).Msg("批量删除子域名失败")
			return err
		}

		log.Info().
			Int("count", len(subdomainIDs)).
			Msg("子域名批量删除成功")

		return nil
	})

	if err != nil {
		return nil, err
	}

	return deletedSubDomains, nil
}

// CreateSubDomainsForDomain 为指定域名批量创建子域名
//
// 功能说明：
// - 为指定域名批量创建子域名
// - 自动去重和跳过已存在的子域名
// - 使用事务保证原子性
//
// 参数：
//   - domainID: 域名ID
//   - subdomains: 子域名列表（完整域名格式，如 www.example.com）
//
// 返回：
//   - *models.CreateSubDomainsResponse: 创建结果
//   - error: 错误信息
func (s *SubDomainService) CreateSubDomainsForDomain(domainID uint, subdomains []string) (*models.CreateSubDomainsResponse, error) {
	// ===== 步骤1：获取域名信息 =====
	var domain models.Domain
	if err := s.db.First(&domain, domainID).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("域名不存在")
		return nil, fmt.Errorf("域名不存在")
	}

	// ===== 步骤2：去重子域名 =====
	uniqueSubdomains := make(map[string]struct{}, len(subdomains)) // 预分配容量
	for _, subdomain := range subdomains {
		normalized := strings.TrimSpace(strings.ToLower(subdomain))
		if normalized != "" {
			uniqueSubdomains[normalized] = struct{}{}
		}
	}

	totalUnique := len(uniqueSubdomains)
	if totalUnique == 0 {
		return &models.CreateSubDomainsResponse{
			TotalUniqueSubdomains: 0,
		}, nil
	}

	// ===== 步骤3：过滤已存在的子域名 =====
	subdomainList := make([]string, 0, totalUnique)
	for subdomain := range uniqueSubdomains {
		subdomainList = append(subdomainList, subdomain)
	}

	// 查询已存在的子域名
	var existingSubdomains []models.SubDomain
	if err := s.db.Where("domain_id = ? AND name IN ?", domainID, subdomainList).Find(&existingSubdomains).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("查询已存在子域名失败")
		return nil, err
	}

	// 构建待创建列表（跳过已存在的）
	existingCount := len(existingSubdomains)
	toCreate := make([]models.SubDomain, 0, totalUnique-existingCount) // 预分配容量
	
	// 使用 map 快速查找已存在的子域名
	existingSet := make(map[string]struct{}, existingCount)
	for _, existing := range existingSubdomains {
		existingSet[existing.Name] = struct{}{}
	}

	for _, subdomain := range subdomainList {
		if _, exists := existingSet[subdomain]; !exists {
			toCreate = append(toCreate, models.SubDomain{
				Name:     subdomain,
				DomainID: domainID,
			})
		}
	}

	// 如果没有需要创建的子域名，直接返回
	if len(toCreate) == 0 {
		log.Info().
			Uint("domain_id", domainID).
			Str("domain_name", domain.Name).
			Int("total_unique", totalUnique).
			Int("already_exists", existingCount).
			Msg("所有子域名已存在，跳过创建")
		
		return &models.CreateSubDomainsResponse{
			SubdomainsCreated:     0,
			TotalUniqueSubdomains: totalUnique,
		}, nil
	}

	// ===== 步骤4：批量插入子域名 =====
	log.Info().
		Uint("domain_id", domainID).
		Str("domain_name", domain.Name).
		Int("to_create", len(toCreate)).
		Int("already_exists", existingCount).
		Msg("开始批量创建子域名")
	
	totalRowsInserted, err := s.batchInsertSubdomains(toCreate)
	if err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("批量插入子域名失败")
		return nil, err
	}

	log.Info().
		Uint("domain_id", domainID).
		Int64("created", totalRowsInserted).
		Int("total_unique", totalUnique).
		Msg("子域名创建完成")

	return &models.CreateSubDomainsResponse{
		SubdomainsCreated:     int(totalRowsInserted),
		TotalUniqueSubdomains: totalUnique,
	}, nil
}
