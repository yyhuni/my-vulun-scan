package services

import (
	"fmt"

	"vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/utils"
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

// GetSubDomains 获取所有子域名列表（固定按 updated_at desc 排序）
func (s *SubDomainService) GetSubDomains(page, pageSize int) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{})

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count all sub domains")
		return nil, err
	}

	// 排序
	query = query.Order("updated_at DESC")

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

	// 计算总页数
	totalPages := 0
	if total > 0 {
		totalPages = int((total-1)/int64(pageSize)) + 1
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
		},
	}

	log.Info().
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("total_pages", totalPages).
		Int("count", len(subDomains)).
		Msg("All sub domains retrieved successfully")

	return response, nil
}

// GetSubDomainsByDomainID 根据域名ID获取子域名列表（固定按 updated_at desc 排序）
func (s *SubDomainService) GetSubDomainsByDomainID(domainID uint, page, pageSize int) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{}).Where("domain_id = ?", domainID)

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to count sub domains by domain")
		return nil, err
	}

	// 排序
	query = query.Order("updated_at DESC")

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

	// 计算总页数
	totalPages := 0
	if total > 0 {
		totalPages = int((total-1)/int64(pageSize)) + 1
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
		},
	}

	log.Info().
		Uint("domain_id", domainID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("total_pages", totalPages).
		Int("count", len(subDomains)).
		Msg("Sub domains by domain retrieved successfully")

	return response, nil
}

// GetSubDomainsByOrgID 根据组织ID获取子域名列表（固定按 updated_at desc 排序）
func (s *SubDomainService) GetSubDomainsByOrgID(orgID uint, page, pageSize int) (*models.GetSubDomainsResponse, error) {
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

	// 排序
	query = query.Order("sub_domains.updated_at DESC")

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

	// 计算总页数
	totalPages := 0
	if total > 0 {
		totalPages = int((total-1)/int64(pageSize)) + 1
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
		},
	}

	log.Info().
		Uint("org_id", orgID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("total_pages", totalPages).
		Int("count", len(subDomains)).
		Msg("Sub domains by organization retrieved successfully")

	return response, nil
}

// batchInsertSubdomains 批量插入子域名
//
// 功能说明：
// 使用事务分批插入子域名到数据库，每批处理1000条记录
// 使用 OnConflict{DoNothing: true} 策略，如果记录已存在则跳过（幂等性）
func (s *SubDomainService) batchInsertSubdomains(subdomainsToInsert []models.SubDomain) (int64, error) {
	var totalRowsInserted int64
	const batchSize = 1000 // 每批插入1000条记录

	// 使用事务确保原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 分批处理，避免单次插入数据量过大
		for i := 0; i < len(subdomainsToInsert); i += batchSize {
			endIndex := i + batchSize
			if endIndex > len(subdomainsToInsert) {
				endIndex = len(subdomainsToInsert)
			}

			batch := subdomainsToInsert[i:endIndex]

			// 批量插入，如果记录已存在则跳过（基于 name 全局唯一索引判断冲突）
			result := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "name"}},
				DoNothing: true,
			}).Create(&batch)
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
func (s *SubDomainService) GetSubDomainsByDomain(domainID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	// 基于域名过滤
	query := s.db.Model(&models.SubDomain{}).Where("domain_id = ?", domainID)

	// 统计总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to count sub domains by domain")
		return nil, err
	}

	// 排序（统一：updated_at DESC）
	query = query.Order("updated_at DESC")

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 查询数据
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to query sub domains by domain")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
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

// GetSubDomainByID 根据ID获取子域名详情
func (s *SubDomainService) GetSubDomainByID(id uint) (*models.GetSubDomainByIDResponseData, error) {

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
	return &models.GetSubDomainByIDResponseData{
		SubDomain: &subDomain,
	}, nil
}

// BatchDeleteSubDomains 批量删除子域名
//
// 功能说明：
// 批量删除多个子域名，通过事务保证原子性
//
// 业务规则：
// 1. **根子域名保护**：不允许删除 IsRoot = true 的子域名（Domain 自动创建的专属子域名）
// 2. 所有子域名ID必须存在，否则返回错误
// 3. 关联的Endpoints和Vulnerabilities会自动级联删除（数据库外键约束）
// 4. 删除操作在事务中执行，保证原子性
//
// 级联删除说明：
// - Endpoints: 子域名删除后，关联的端点也会被删除
// - Vulnerabilities: 子域名删除后，关联的漏洞记录也会被删除
//
// 性能优化：
// - 在大规模数据场景（如100W+子域名）下，去除预查询以提升性能
// - 通过 RowsAffected 验证删除数量，减少数据库查询次数
// - 不返回完整对象列表，只返回删除数量
//
// 参数：
//   - subdomainIDs: 需要删除的子域名ID列表
//
// 返回：
//   - int: 实际删除的子域名数量
//   - error: 如果验证失败或删除失败则返回错误
func (s *SubDomainService) BatchDeleteSubDomains(subdomainIDs []uint) (int, error) {
	if len(subdomainIDs) == 0 {
		return 0, fmt.Errorf("子域名ID列表不能为空")
	}

	var deletedCount int64

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 检查是否有根子域名（IsRoot = true 的记录不允许删除）
		var rootSubdomains []models.SubDomain
		if err := tx.Where("id IN ? AND is_root = ?", subdomainIDs, true).Find(&rootSubdomains).Error; err != nil {
			log.Error().Err(err).Msg("查询根子域名失败")
			return err
		}

		if len(rootSubdomains) > 0 {
			// 收集根子域名的名称用于错误提示
			rootNames := make([]string, 0, len(rootSubdomains))
			for _, sub := range rootSubdomains {
				rootNames = append(rootNames, sub.Name)
			}
			log.Warn().
				Strs("root_subdomains", rootNames).
				Msg("尝试删除根子域名被拒绝")
			return fmt.Errorf("不允许删除根子域名（Domain 专属子域名）: %v", rootNames)
		}

		// 步骤2: 批量删除非根子域名
		// 数据库已配置 CASCADE，会自动删除关联的 Endpoints 和 Vulnerabilities
		result := tx.Where("id IN ?", subdomainIDs).Delete(&models.SubDomain{})
		if result.Error != nil {
			log.Error().Err(result.Error).Msg("批量删除子域名失败")
			return result.Error
		}

		deletedCount = result.RowsAffected

		// 检查删除的行数是否与请求的ID数量一致
		if deletedCount != int64(len(subdomainIDs)) {
			log.Warn().
				Int("requested", len(subdomainIDs)).
				Int64("deleted", deletedCount).
				Msg("部分子域名ID不存在")
			return fmt.Errorf("请求删除 %d 个子域名，实际删除 %d 个，部分ID不存在", len(subdomainIDs), deletedCount)
		}

		log.Info().
			Int64("count", deletedCount).
			Msg("子域名批量删除成功")

		return nil
	})

	if err != nil {
		return 0, err
	}

	return int(deletedCount), nil
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
//   - *models.CreateSubDomainsResponseData: 创建结果
//   - error: 错误信息
func (s *SubDomainService) CreateSubDomainsForDomain(domainID uint, subdomains []string) (*models.CreateSubDomainsResponseData, error) {
	// ===== 步骤1：获取域名信息 =====
	var domain models.Domain
	if err := s.db.First(&domain, domainID).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("域名不存在")
		return nil, fmt.Errorf("域名不存在")
	}

	// ===== 步骤2：归属验证（业务规则验证）=====
	// Handler 层传入的子域名已经规范化和格式验证过，这里只需验证业务规则
	for _, subdomain := range subdomains {
		if err := utils.ValidateSubdomainBelongsTo(subdomain, domain.Name); err != nil {
			log.Warn().
				Str("subdomain", subdomain).
				Str("parent_domain", domain.Name).
				Msg("子域名归属验证失败")
			return nil, fmt.Errorf("子域名 '%s' 不属于域名 '%s'", subdomain, domain.Name)
		}
	}

	// ===== 步骤3：去重子域名 =====
	// Handler 层已经规范化，这里直接去重即可
	uniqueSubdomains := make(map[string]struct{}, len(subdomains))
	for _, subdomain := range subdomains {
		uniqueSubdomains[subdomain] = struct{}{}
	}

	if len(uniqueSubdomains) == 0 {
		log.Info().
			Uint("domain_id", domainID).
			Str("domain_name", domain.Name).
			Msg("没有需要创建的子域名")

		return &models.CreateSubDomainsResponseData{
			BaseBatchCreateResponseData: models.BaseBatchCreateResponseData{
				Message:        "没有需要创建的子域名",
				TotalRequested: 0,
				NewCreated:     0,
				AlreadyExisted: 0,
			},
		}, nil
	}

	// ===== 步骤4：构建待插入列表 =====
	// 直接从 map 构造，避免中间切片分配
	subdomainsToInsert := make([]models.SubDomain, 0, len(uniqueSubdomains))
	for subdomain := range uniqueSubdomains {
		subdomainsToInsert = append(subdomainsToInsert, models.SubDomain{
			Name:     subdomain,
			DomainID: domainID,
		})
	}

	// ===== 步骤5：批量插入子域名 =====
	log.Info().
		Uint("domain_id", domainID).
		Str("domain_name", domain.Name).
		Int("to_insert", len(subdomainsToInsert)).
		Msg("开始批量插入子域名")

	totalRowsInserted, err := s.batchInsertSubdomains(subdomainsToInsert)
	if err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("批量插入子域名失败")
		return nil, err
	}

	// 计算统计信息
	totalUnique := len(subdomainsToInsert) // 请求插入的总数（包含可能已存在的）
	alreadyExisted := totalUnique - int(totalRowsInserted)

	log.Info().
		Uint("domain_id", domainID).
		Int("total_requested", totalUnique).
		Int("new_created", int(totalRowsInserted)).
		Int("already_existed", alreadyExisted).
		Msg("子域名创建完成")

	return &models.CreateSubDomainsResponseData{
		BaseBatchCreateResponseData: models.BaseBatchCreateResponseData{
			Message:        fmt.Sprintf("成功处理 %d 个子域名，新创建 %d 个，%d 个已存在", totalUnique, int(totalRowsInserted), alreadyExisted),
			TotalRequested: totalUnique,
			NewCreated:     int(totalRowsInserted),
			AlreadyExisted: alreadyExisted,
		},
	}, nil
}
