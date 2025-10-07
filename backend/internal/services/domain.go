package services

import (
	"fmt"

	"vulun-scan-backend/internal/errors"
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

// CreateDomains 批量创建域名并关联到组织
//
// 业务逻辑说明：
// 1. 验证目标组织是否存在（避免无效关联）
// 2. 对于每个域名：
//    a. 检查域名是否已存在于系统中（基于 name 字段去重）
//    b. 如果不存在，则创建新域名
//    c. 检查该域名是否已关联到目标组织（避免重复关联）
//    d. 如果未关联，则创建关联关系
// 3. 返回所有处理过的域名列表（包括新创建和已存在的）
//
// 设计考虑：
// - 使用事务确保数据一致性：要么全部成功，要么全部回滚
// - 支持幂等性：重复提交相同域名不会报错，只会跳过
// - 域名可以被多个组织共享，通过中间表 organization_domains 实现多对多关系
//
// 注意事项：
// - 如果组织不存在会立即返回错误
// - 事务失败会自动回滚，不会产生脏数据
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) ([]models.Domain, error) {

	var createdDomains []models.Domain

	// 步骤1: 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	// 步骤2: 使用事务处理批量创建和关联
	// 事务的作用：确保所有域名的创建和关联操作要么全部成功，要么全部回滚
	// 避免出现部分域名创建成功、部分失败的不一致状态
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, detail := range req.Domains {
			var domain models.Domain

			// 步骤2.1: 检查域名是否已存在于系统中
			// 域名的唯一性基于 name 字段，不同组织可以共享同一个域名
			result := tx.Where("name = ?", detail.Name).First(&domain)
			if result.Error != nil {
				if result.Error == gorm.ErrRecordNotFound {
					// 步骤2.2: 域名不存在，创建新的域名记录
					domain = models.Domain{
						Name:        detail.Name,
						Description: detail.Description,
					}
					if err := tx.Create(&domain).Error; err != nil {
						log.Error().Err(err).
							Str("domain_name", detail.Name).
							Msg("Failed to create domain")
						return err
					}
					log.Info().
						Uint("id", domain.ID).
						Str("name", domain.Name).
						Msg("Domain created successfully")
				} else {
					log.Error().Err(result.Error).Msg("Failed to query domain")
					return result.Error
				}
			}

			// 步骤2.3: 检查该域名是否已关联到目标组织
			// 这是幂等性的关键：避免重复关联同一个域名到同一个组织
			var existingAssoc models.OrganizationDomain
			assocResult := tx.Where("organization_id = ? AND domain_id = ?", req.OrganizationID, domain.ID).
				First(&existingAssoc)

			if assocResult.Error != nil {
				if assocResult.Error == gorm.ErrRecordNotFound {
					// 步骤2.4: 未关联，创建新的关联关系
					newAssociation := models.OrganizationDomain{
						OrganizationID: req.OrganizationID,
						DomainID:       domain.ID,
					}
					if err := tx.Create(&newAssociation).Error; err != nil {
						log.Error().Err(err).
							Uint("organization_id", req.OrganizationID).
							Uint("domain_id", domain.ID).
							Msg("Failed to associate domain with organization")
						return err
					}
					log.Info().
						Uint("organization_id", req.OrganizationID).
						Uint("domain_id", domain.ID).
						Msg("Domain associated with organization successfully")
				} else {
					log.Error().Err(assocResult.Error).Msg("Failed to query association")
					return assocResult.Error
				}
			}

			// 步骤2.5: 将域名添加到结果列表（包括新创建和已存在的域名）
			createdDomains = append(createdDomains, domain)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Int("total_domains", len(createdDomains)).
		Msg("Domains created and associated successfully")

	return createdDomains, nil
}

// GetDomainByID 根据ID获取域名
func (s *DomainService) GetDomainByID(id uint) (*models.Domain, error) {

	var domain models.Domain

	result := s.db.Preload("SubDomains").First(&domain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, errors.ErrDomainNotFound
		}
		log.Error().Err(result.Error).Msg("Failed to query domain")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Domain retrieved successfully")
	return &domain, nil
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
func (s *DomainService) GetDomainsByOrgID(req models.GetOrganizationDomainsRequest) (*models.GetOrganizationDomainsResponse, error) {
	// 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	var domains []models.Domain
	var total int64

	// 通过 JOIN 中间表查询该组织的域名总数
	// JOIN 的作用：从 domains 表中筛选出与该组织关联的所有域名
	if err := s.db.Model(&models.Domain{}).
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrganizationID).
		Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count domains")
		return nil, err
	}

	// 计算总页数（向上取整）
	// 例如：total=25, pageSize=10 => totalPages=3
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建安全的排序子句（防止 SQL 注入）
	orderClause := s.buildOrderClause(req.SortBy, req.SortOrder)

	// 执行分页查询，支持动态排序
	offset := (req.Page - 1) * req.PageSize
	result := s.db.
		Joins("JOIN organization_domains ON organization_domains.domain_id = domains.id").
		Where("organization_domains.organization_id = ?", req.OrganizationID).
		Order(orderClause).
		Offset(offset).
		Limit(req.PageSize).
		Find(&domains)

	if result.Error != nil {
		log.Error().Err(result.Error).
			Uint("organization_id", req.OrganizationID).
			Msg("Failed to query domains by organization ID")
		return nil, result.Error
	}

	log.Info().
		Uint("organization_id", req.OrganizationID).
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(domains)).
		Msg("Domains retrieved successfully")

	return &models.GetOrganizationDomainsResponse{
		Domains:    domains,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}, nil
}

// buildOrderClause 构建安全的排序子句
//
// 安全机制：
// - 使用白名单验证排序字段，防止 SQL 注入攻击
// - 只允许预定义的字段进行排序
// - 非法字段会被替换为默认值，不会报错
//
// 示例：
// - 合法输入: sortBy="name", sortOrder="asc" => "domains.name asc"
// - 非法输入: sortBy="id; DROP TABLE", sortOrder="asc" => "domains.updated_at desc"（使用默认值）
func (s *DomainService) buildOrderClause(sortBy, sortOrder string) string {
	// 验证排序字段（白名单机制）
	validSortFields := map[string]bool{
		"name":       true,
		"created_at": true,
		"updated_at": true,
	}
	if !validSortFields[sortBy] {
		sortBy = "updated_at"
	}

	// 验证排序方向（只允许 asc 或 desc）
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc" // 默认降序
	}

	// 拼接排序子句（需要加表名前缀避免歧义）
	return fmt.Sprintf("domains.%s %s", sortBy, sortOrder)
}

// RemoveOrganizationDomain 解除组织与域名的关联，如果域名成为孤儿则删除
//
// 业务逻辑说明：
// 1. 验证组织和域名是否存在
// 2. 验证关联关系是否存在
// 3. 解除关联（删除 organization_domains 中间表记录）
// 4. 检查域名是否成为孤儿（没有任何组织关联）
// 5. 如果是孤儿域名，则自动删除该域名
//
// 孤儿域名的定义：
// - 在 domains 表中存在，但在 organization_domains 表中没有任何关联记录
// - 这种域名没有实际用途，应该被清理以节省存储空间
//
// 设计考虑：
// - 使用事务确保关联解除和域名删除的原子性
// - 自动清理孤儿域名，避免数据库中产生垃圾数据
// - 多层验证确保操作的安全性
//
// 使用场景：
// - 前端用户从组织中移除某个域名时调用
// - 如果这是最后一个使用该域名的组织，域名会被自动删除
func (s *DomainService) RemoveOrganizationDomain(req models.RemoveOrganizationDomainRequest) error {

	// 使用事务确保数据一致性：关联解除和孤儿域名删除要么全部成功，要么全部回滚
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 验证组织是否存在
		var org models.Organization
		if err := tx.First(&org, "id = ?", req.OrganizationID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("organization_id", req.OrganizationID).Msg("Organization not found")
				return errors.ErrOrganizationNotFound
			}
			log.Error().Err(err).Msg("Failed to query organization")
			return err
		}

		// 步骤2: 验证域名是否存在
		var domain models.Domain
		if err := tx.First(&domain, "id = ?", req.DomainID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("domain_id", req.DomainID).Msg("Domain not found")
				return errors.ErrDomainNotFound
			}
			log.Error().Err(err).Msg("Failed to query domain")
			return err
		}

		// 步骤3: 验证关联关系是否存在
		// 如果关联不存在，说明操作无效，应该返回错误
		var count int64
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("organization_id = ? AND domain_id = ?", req.OrganizationID, req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query association")
			return err
		}

		if count == 0 {
			log.Error().
				Uint("organization_id", req.OrganizationID).
				Uint("domain_id", req.DomainID).
				Msg("Association not found")
			return errors.ErrAssociationNotFound
		}

		// 步骤4: 使用 GORM 的 Association 方法删除关联
		// Association().Delete() 会自动处理中间表，比手动 DELETE 更安全
		if err := tx.Model(&org).Association("Domains").Delete(&domain); err != nil {
			log.Error().Err(err).Msg("Failed to delete association")
			return err
		}

		log.Info().
			Uint("organization_id", req.OrganizationID).
			Uint("domain_id", req.DomainID).
			Msg("Association removed successfully")

		// 步骤5: 检查域名是否成为孤儿（没有任何组织关联）
		// 查询 organization_domains 表中是否还有该域名的关联记录
		if err := tx.Model(&models.OrganizationDomain{}).
			Where("domain_id = ?", req.DomainID).
			Count(&count).Error; err != nil {
			log.Error().Err(err).Msg("Failed to count domain associations")
			return err
		}

		// 步骤6: 如果是孤儿域名，则自动删除
		// 孤儿域名没有实际用途，应该被清理以保持数据库整洁
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
