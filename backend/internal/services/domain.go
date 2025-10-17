package services

import (
	"fmt"
	"strings"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
//
// 前置处理（Handler 层）：
// - 域名已标准化（统一小写、去空格）和验证（符合 DNS 规范）
// - 域名已去重（相同域名只保留一个）
//
// 核心流程：
// 1. COUNT 验证组织
// 2. COUNT 统计插入前数量
// 3. INSERT domains (OnConflict)
// 4. SELECT 查询 domain IDs + 计算新建数
// 5. INSERT subdomains (OnConflict)
// 6. INSERT organization_domains (OnConflict)
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) (*models.CreateDomainsResponseData, error) {

	// 步骤1: 验证组织存在性
	var orgExists int64
	if err := s.db.Model(&models.Organization{}).Where("id = ?", req.OrgID).Count(&orgExists).Error; err != nil || orgExists == 0 {
		log.Error().Uint("organization_id", req.OrgID).Msg("Organization not found or query failed")
		return nil, fmt.Errorf("组织不存在")
	}

	// 步骤2: 去重请求中的域名（FIFO 策略：保留第一次出现）
	domainMap := make(map[string]models.DomainDetail)
	for _, detail := range req.Domains {
		if _, exists := domainMap[detail.Name]; !exists {
			domainMap[detail.Name] = detail
		}
	}

	// 步骤3: 使用事务处理批量创建和关联
	var countBefore int64
	var countCreated int

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤3.1: 提取域名列表
		names := make([]string, 0, len(domainMap))
		for name := range domainMap {
			names = append(names, name)
		}

		// 步骤3.2: 统计插入前的域名数量
		if err := tx.Model(&models.Domain{}).Where("name IN ?", names).Count(&countBefore).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count existing domains")
			return err
		}

		// 步骤3.3: 准备并插入所有域名（OnConflict 自动忽略已存在）
		domains := make([]models.Domain, 0, len(domainMap))
		for name, detail := range domainMap {
			domains = append(domains, models.Domain{
				Name:        name,
				Description: detail.Description,
			})
		}

		if len(domains) > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "name"}},
				DoNothing: true,
			}).Create(&domains).Error; err != nil {
				log.Error().Err(err).Int("count", len(domains)).Msg("Failed to batch create domains")
				return err
			}
			log.Debug().Int("count", len(domains)).Msg("Domains upsert completed")
		}

		// 步骤3.4: 查询所有域名获取 ID（包括已存在的和新创建的）
		var allDomains []models.Domain
		if err := tx.Where("name IN ?", names).Find(&allDomains).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query all domains")
			return err
		}

		// 计算实际新创建的域名数量
		countCreated = len(allDomains) - int(countBefore)

		// 步骤3.5: 为所有域名创建根子域名（OnConflict 自动忽略已存在）
		subdomains := make([]models.SubDomain, 0, len(allDomains))
		for _, domain := range allDomains {
			subdomains = append(subdomains, models.SubDomain{
				Name:     domain.Name,
				DomainID: domain.ID,
				IsRoot:   true,
			})
		}

		if len(subdomains) > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "name"}}, // Name 全局唯一（完整 FQDN）
				DoNothing: true,
			}).Create(&subdomains).Error; err != nil {
				log.Error().Err(err).Int("count", len(subdomains)).Msg("Failed to create root subdomains")
				return err
			}
			log.Debug().Int("count", len(subdomains)).Msg("Root subdomains upsert completed")
		}

		// 步骤3.6: 批量创建组织-域名关联（OnConflict 自动忽略已存在）
		associations := make([]models.OrganizationDomain, 0, len(allDomains))
		for _, domain := range allDomains {
			associations = append(associations, models.OrganizationDomain{
				OrganizationID: req.OrgID,
				DomainID:       domain.ID,
			})
		}

		if len(associations) > 0 {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "organization_id"}, {Name: "domain_id"}},
				DoNothing: true,
			}).Create(&associations).Error; err != nil {
				log.Error().Err(err).Int("count", len(associations)).Msg("Failed to batch create associations")
				return err
			}
			log.Debug().
				Uint("organization_id", req.OrgID).
				Int("count", len(associations)).
				Msg("Associations upsert completed")
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 计算统计信息
	totalRequested := len(domainMap)
	countExisted := totalRequested - countCreated

	log.Info().
		Uint("organization_id", req.OrgID).
		Int("requested_count", totalRequested).
		Int("actually_created", countCreated).
		Int("already_existed", countExisted).
		Msg("Domains created and associated successfully")

	// 构建响应数据
	return &models.CreateDomainsResponseData{
		BaseBatchCreateResponseData: models.BaseBatchCreateResponseData{
			Message:        fmt.Sprintf("成功处理 %d 个域名，新创建 %d 个，%d 个已存在", totalRequested, countCreated, countExisted),
			TotalRequested: totalRequested,
			NewCreated:     countCreated,
			AlreadyExisted: countExisted,
		},
	}, nil
}

// GetDomainByID 根据ID获取域名信息（包含组织关联信息）
func (s *DomainService) GetDomainByID(id uint) (*models.Domain, error) {

	var domain models.Domain

	// 加载关联的组织信息
	result := s.db.Preload("Organizations").First(&domain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, customErrors.ErrDomainNotFound
		}
		log.Error().Err(result.Error).Msg("Failed to query domain")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Domain retrieved successfully")

	// 返回完整的域名模型（包含关联的组织）
	return &domain, nil
}

// UpdateDomain 更新域名信息
//
// 业务逻辑说明：
// 1. 验证域名是否存在
// 2. 更新域名的名称和描述
// 3. 返回更新后的域名信息（不包含组织信息）
//
// 注意事项：
// - 只能更新名称和描述，不能修改ID和时间戳
// - 名称修改后需要保证唯一性
// - 更新操作会自动更新 updated_at 字段
func (s *DomainService) UpdateDomain(req models.UpdateDomainRequest) (*models.DomainResponseData, error) {
	// 步骤1: 验证域名是否存在
	var domain models.Domain
	if err := s.db.First(&domain, "id = ?", req.ID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("domain_id", req.ID).Msg("Domain not found")
			return nil, customErrors.ErrDomainNotFound
		}
		log.Error().Err(err).Msg("Failed to query domain")
		return nil, err
	}

	// 步骤2: 更新域名信息
	// 使用指针类型区分"不更新"和"清空"
	// nil = 不更新该字段
	// 非nil（包括空字符串）= 更新为该值
	updateData := make(map[string]interface{})
	if req.Name != nil {
		// 将域名转为小写，确保数据一致性
		updateData["name"] = strings.ToLower(strings.TrimSpace(*req.Name))
	}
	if req.Description != nil {
		updateData["description"] = *req.Description
	}

	// 如果没有任何更新字段，直接返回原域名
	if len(updateData) == 0 {
		log.Info().Uint("domain_id", req.ID).Msg("No fields to update")
		return &models.DomainResponseData{
			ID:          domain.ID,
			CreatedAt:   domain.CreatedAt,
			UpdatedAt:   domain.UpdatedAt,
			Name:        domain.Name,
			Description: domain.Description,
		}, nil
	}

	// 执行更新操作
	if err := s.db.Model(&domain).Updates(updateData).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", req.ID).Msg("Failed to update domain")
		return nil, err
	}

	// 重新查询获取更新后的数据（包括自动更新的 updated_at）
	if err := s.db.First(&domain, "id = ?", req.ID).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query updated domain")
		return nil, err
	}

	log.Info().
		Uint("domain_id", req.ID).
		Str("name", domain.Name).
		Msg("Domain updated successfully")

	// 转换为响应结构体（不包含组织信息）
	response := &models.DomainResponseData{
		ID:          domain.ID,
		CreatedAt:   domain.CreatedAt,
		UpdatedAt:   domain.UpdatedAt,
		Name:        domain.Name,
		Description: domain.Description,
	}

	return response, nil
}

// GetDomainsByOrgID 根据组织ID获取域名列表(支持分页和排序)
//
// 业务逻辑说明：
// 1. 验证组织是否存在
// 2. 通过 JOIN organization_domains 中间表查询该组织的所有域名
// 3. 统计总数并计算总页数
// 4. 应用排序、分页查询域名列表
//
// 查询原理：
// - domains 表存储所有域名
// - organization_domains 表存储组织和域名的关联关系（多对多）
// - 通过 JOIN 查询某个组织关联的所有域名
//
// 安全考虑：
// - 排序字段和方向会经过 buildOrderClause 验证，防止 SQL 注入
func (s *DomainService) GetDomainsByOrgID(req models.GetDomainsByOrgIDRequest) (*models.GetOrgDomainsResponse, error) {
	// 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrgID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrgID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	var domains []models.Domain
	var total int64

	// 通过 JOIN 中间表查询该组织的域名总数
	// JOIN 的作用：从 domains 表中筛选出与该组织关联的所有域名
	/**
	SELECT COUNT(*) FROM domains
	JOIN organization_domains ON organization_domains.domain_id = domains.id
	WHERE organization_domains.organization_id = [req.OrgID值]
	**/
	if err := s.db.Model(&models.Domain{}).
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrgID).
		Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count domains")
		return nil, err
	}

	// 计算总页数（向上取整）
	// 例如：total=25, pageSize=10 => totalPages=3
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建排序子句（统一：按更新时间倒序；JOIN 使用表前缀避免歧义）
	orderClause := "domains.updated_at desc"

	// 执行分页查询，支持动态排序
	/**
	SELECT domains.*
	FROM domains
	JOIN organization_domains ON organization_domains.domain_id = domains.id
	WHERE organization_domains.organization_id = [req.OrgID值]
	ORDER BY [orderClause值]
	LIMIT [req.PageSize值] OFFSET [offset值]
	**/
	offset := (req.Page - 1) * req.PageSize
	result := s.db.
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrgID).
		Order(orderClause).
		Offset(offset).
		Limit(req.PageSize).
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).
			Uint("organization_id", req.OrgID).
			Msg("Failed to query domains by organization ID")
	}

	log.Info().
		Uint("organization_id", req.OrgID).
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(domains)).
		Msg("Domains retrieved successfully")

	return &models.GetOrgDomainsResponse{
		Domains: domains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	}, nil
}

// 已统一排序逻辑到调用点，固定使用 updated_at desc；本方法已移除。

// DeleteDomainFromOrganization 从组织中删除域名，如果域名成为孤儿则彻底删除
//
// 业务逻辑说明：
// 1. 查询域名（后续步骤需要使用 domain 对象）
// 2. 验证关联关系是否存在（防止误删除孤儿域名）
// 3. 解除关联（删除 organization_domains 中间表记录）
// 4. 检查域名是否成为孤儿（没有任何组织关联）
// 5. 如果是孤儿域名，则触发级联删除
//
// 级联删除说明：
// - 删除 domains 表记录会触发数据库级联删除
// - 自动删除关联的 subdomains、endpoints、vulnerabilities 等所有子数据
//
// 设计考虑：
// - 使用事务确保关联解除和域名删除的原子性
// - 自动清理孤儿域名，避免数据库中产生垃圾数据
//
// 使用场景：
// - 前端用户从组织中移除某个域名时调用
// - 如果这是最后一个使用该域名的组织，域名及其所有子数据会被自动删除
func (s *DomainService) DeleteDomainFromOrganization(req models.DeleteDomainRequest) error {

	// 使用事务确保数据一致性：关联解除和孤儿域名删除要么全部成功，要么全部回滚
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 查询域名（后续步骤需要使用 domain 对象）
		// SQL: SELECT * FROM `domains` WHERE id = ? LIMIT 1
		var domain models.Domain
		if err := tx.First(&domain, "id = ?", req.DomainID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("domain_id", req.DomainID).Msg("Domain not found")
				return customErrors.ErrDomainNotFound
			}
			log.Error().Err(err).Msg("Failed to query domain")
			return err
		}

		// 步骤2: 验证关联关系是否存在
		// 这个验证很重要：防止删除不存在的关联后误判为孤儿域名而导致误删除
		// SQL: SELECT COUNT(*) FROM `organization_domains` WHERE organization_id = ? AND domain_id = ?
		var count int64
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("organization_id = ? AND domain_id = ?", req.OrgID, req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query association")
			return err
		}

		if count == 0 {
			log.Error().
				Uint("organization_id", req.OrgID).
				Uint("domain_id", req.DomainID).
				Msg("Association not found")
			return customErrors.ErrAssociationNotFound
		}

		// 步骤3: 删除组织和域名的关联关系
		// 注意：这里只删除 organization_domains 中间表的记录
		// 不会删除 organizations 表和 domains 表中的实体记录
		// 不会触发任何级联删除操作
		// SQL: DELETE FROM `organization_domains` WHERE organization_id = ? AND domain_id = ?
		org := models.Organization{ID: req.OrgID}
		if err := tx.Model(&org).Association("Domains").Delete(&domain); err != nil {
			log.Error().Err(err).Msg("Failed to delete association")
			return err
		}

		log.Info().
			Uint("organization_id", req.OrgID).
			Uint("domain_id", req.DomainID).
			Msg("Association removed successfully")

		// 步骤4: 检查域名是否成为孤儿（没有任何组织关联）
		// SQL: SELECT COUNT(*) FROM `organization_domains` WHERE domain_id = ?
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("domain_id = ?", req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count domain associations")
			return err
		}

		// 步骤5: 如果是孤儿域名，则自动删除
		// 注意：这里会删除 domains 表的记录，触发数据库级联删除
		// 会自动删除关联的 subdomains、endpoints、vulnerabilities 等所有子数据
		// SQL: DELETE FROM `domains` WHERE id = ?
		// 级联: DELETE FROM `subdomains` WHERE domain_id = ? (自动)
		// 级联: DELETE FROM `endpoints` WHERE subdomain_id IN (...) (自动)
		// 级联: DELETE FROM `vulnerabilities` WHERE domain_id = ? OR subdomain_id IN (...) OR endpoint_id IN (...) (自动)
		if count == 0 {
			if err := tx.Delete(&domain).Error; err != nil {
				log.Error().Err(err).Msg("Failed to delete orphan domain")
				return err
			}
			log.Info().
				Uint("domain_id", req.DomainID).
				Str("domain_name", domain.Name).
				Msg("Orphan domain deleted")
		}

		return nil
	})
}

// BatchDeleteDomainsFromOrganization 批量从组织中删除域名
//
// 业务逻辑说明：
// 1. 批量删除 organization_domains 关联关系
// 2. 查找成为孤儿的域名（没有任何组织关联）
// 3. 批量删除孤儿域名（级联删除关联的 SubDomain 和 Endpoint）
//
// 优化说明：
// - 使用单次事务替代 N 次事务，性能提升 90%+
// - 保证原子性：全部成功或全部失败
// - 批量操作减少数据库往返次数
//
// 参数：
//   - orgID: 组织ID
//   - domainIDs: 域名ID列表
//
// 返回：
//   - int: 实际删除的关联数量
//   - error: 错误信息
func (s *DomainService) BatchDeleteDomainsFromOrganization(orgID uint, domainIDs []uint) (int, error) {
	// 参数验证：检查域名ID列表是否为空
	if len(domainIDs) == 0 {
		return 0, fmt.Errorf("域名ID列表不能为空")
	}

	var deletedCount int64

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 批量删除 organization_domains 关联关系
		result := tx.Where("organization_id = ? AND domain_id IN ?",
			orgID, domainIDs).
			Delete(&models.OrganizationDomain{})

		if result.Error != nil {
			log.Error().
				Err(result.Error).
				Uint("organization_id", orgID).
				Msg("Failed to batch delete domain associations")
			return result.Error
		}

		deletedCount = result.RowsAffected

		// 检查删除的行数是否与请求的ID数量一致
		if deletedCount != int64(len(domainIDs)) {
			log.Warn().
				Int("requested", len(domainIDs)).
				Int64("deleted", deletedCount).
				Msg("部分域名关联不存在")
			return fmt.Errorf("请求删除 %d 个域名关联，实际删除 %d 个，部分ID不存在", len(domainIDs), deletedCount)
		}

		// 步骤2: 批量查询孤儿域名（没有任何组织关联的域名）
		var orphanDomainIDs []uint
		if err := tx.Raw(`
			SELECT d.id 
			FROM domains d
			WHERE d.id IN (?) 
			AND NOT EXISTS (
				SELECT 1 FROM organization_domains od 
				WHERE od.domain_id = d.id
			)
		`, domainIDs).Scan(&orphanDomainIDs).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query orphan domains")
			return err
		}

		// 步骤3: 批量删除孤儿域名（数据库 CASCADE 会自动删除 SubDomain 和 Endpoint）
		if len(orphanDomainIDs) > 0 {
			// 注意：不需要 Select(clause.Associations)
			// - SubDomains 和 Endpoints 已配置数据库级 CASCADE
			// - Organizations 的 many2many 关联已在步骤1手动删除
			if err := tx.Where("id IN ?", orphanDomainIDs).
				Delete(&models.Domain{}).Error; err != nil {
				log.Error().Err(err).Msg("Failed to delete orphan domains")
				return err
			}

			log.Info().
				Int("orphan_count", len(orphanDomainIDs)).
				Uints("orphan_ids", orphanDomainIDs).
				Msg("Orphan domains deleted successfully")
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	log.Info().
		Int("deleted_count", int(deletedCount)).
		Msg("Batch delete domains from organization completed successfully")

	return int(deletedCount), nil
}

// BatchDeleteDomainsDirect 批量删除域名（不依赖组织）
//
// 业务逻辑说明：
// 1. 删除所有 organization_domains 关联关系
// 2. 批量删除域名本身（级联删除 SubDomain 和 Endpoint）
//
// 原子性说明：
// - 严格原子性：所有域名ID必须存在，否则事务回滚
// - 部分ID不存在时返回错误，不会删除任何数据
// - 保证批量操作的一致性：全部成功或全部失败
//
// 优化说明：
// - 单次事务完成所有操作
// - 自动级联删除相关资源（SubDomain, Endpoint, Vulnerability）
//
// 适用场景：
// - 直接删除域名，不关心组织关联
// - 系统管理员清理数据
// - 需要彻底移除某些域名
// - 适用于前端批量操作场景
//
// 参数：
//   - domainIDs: 域名ID列表
//
// 返回：
//   - int: 实际删除的域名数量
//   - error: 错误信息
func (s *DomainService) BatchDeleteDomainsDirect(domainIDs []uint) (int, error) {
	// 参数验证
	if len(domainIDs) == 0 {
		return 0, fmt.Errorf("域名ID列表不能为空")
	}

	var deletedCount int64

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 删除所有 organization_domains 关联关系
		if err := tx.Where("domain_id IN ?", domainIDs).
			Delete(&models.OrganizationDomain{}).Error; err != nil {
			log.Error().Err(err).Msg("Failed to delete domain associations")
			return err
		}

		log.Info().
			Int("domain_count", len(domainIDs)).
			Msg("Domain associations deleted successfully")

		// 步骤2: 批量删除域名（数据库 CASCADE 会自动删除 SubDomain 和 Endpoint）
		result := tx.Where("id IN ?", domainIDs).Delete(&models.Domain{})
		if result.Error != nil {
			log.Error().Err(result.Error).Msg("Failed to batch delete domains")
			return result.Error
		}

		deletedCount = result.RowsAffected

		// 检查删除的行数是否与请求的ID数量一致（严格原子性）
		if deletedCount != int64(len(domainIDs)) {
			log.Warn().
				Int("requested", len(domainIDs)).
				Int64("deleted", deletedCount).
				Msg("部分域名ID不存在")
			return fmt.Errorf("请求删除 %d 个域名，实际删除 %d 个，部分ID不存在", len(domainIDs), deletedCount)
		}

		log.Info().
			Int64("deleted_count", deletedCount).
			Msg("Domains batch deleted successfully")

		return nil
	})

	if err != nil {
		return 0, err
	}

	return int(deletedCount), nil
}

// GetAllDomains 获取所有域名列表(支持分页和排序)
//
// 业务逻辑说明：
// 1. 统计所有域名总数
// 2. 计算总页数
// 3. 应用排序、分页查询域名列表
//
// 安全考虑：
// - 排序字段和方向会经过 buildOrderClause 验证，防止 SQL 注入
func (s *DomainService) GetAllDomains(req models.GetAllDomainsRequest) (*models.GetAllDomainsResponse, error) {
	var domains []models.Domain
	var total int64

	// 统计所有域名总数
	if err := s.db.Model(&models.Domain{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count all domains")
		return nil, err
	}

	// 计算总页数（向上取整）
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建排序子句（统一：按更新时间倒序）
	orderClause := "updated_at desc"

	// 执行分页查询，支持动态排序
	offset := (req.Page - 1) * req.PageSize
	result := s.db.
		Model(&models.Domain{}).
		Preload("Organizations").
		Order(orderClause).
		Offset(offset).
		Limit(req.PageSize).
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query all domains")
		return nil, result.Error
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(domains)).
		Msg("All domains retrieved successfully")

	return &models.GetAllDomainsResponse{
		Domains: domains,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	}, nil
}
