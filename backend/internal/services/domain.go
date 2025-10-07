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
// 2. 批量查询已存在的域名（1次查询代替N次）
// 3. 批量创建新域名（1次插入代替N次）
// 4. 批量查询已存在的关联关系（1次查询代替N次）
// 5. 批量创建新关联关系（1次插入代替N次）
// 6. 返回所有处理过的域名列表（包括新创建和已存在的）
//
// 设计考虑：
// - 使用事务确保数据一致性：要么全部成功，要么全部回滚
// - 支持幂等性：重复提交相同域名不会报错，只会跳过
// - 域名可以被多个组织共享，通过中间表 organization_domains 实现多对多关系
// - 使用 map 结构快速查找，避免嵌套循环
//
// 注意事项：
// - 如果组织不存在会立即返回错误
// - 事务失败会自动回滚，不会产生脏数据
func (s *DomainService) CreateDomains(req models.CreateDomainsRequest) ([]models.Domain, error) {

	var resultDomains []models.Domain
	var newDomainsCount int // 用于统计新创建的域名数量

	// 步骤1: 验证组织是否存在
	var org models.Organization
	if err := s.db.First(&org, "id = ?", req.OrgID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("organization_id", req.OrgID).Msg("Organization not found")
			return nil, fmt.Errorf("组织不存在")
		}
		log.Error().Err(err).Msg("Failed to query organization")
		return nil, err
	}

	// 步骤2: 使用事务处理批量创建和关联
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤2.1: 收集所有域名名称并构建映射
		domainNames := make([]string, 0, len(req.Domains))
		domainDetailMap := make(map[string]models.DomainDetail)
		for _, detail := range req.Domains {
			domainNames = append(domainNames, detail.Name)
			domainDetailMap[detail.Name] = detail
		}

		// 步骤2.2: 批量查询已存在的域名（1次查询）
		var existingDomains []models.Domain
		if err := tx.Where("name IN ?", domainNames).Find(&existingDomains).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query existing domains")
			return err
		}

		// 步骤2.3: 构建已存在域名的映射（name -> Domain）
		existingDomainMap := make(map[string]models.Domain)
		existingDomainIDs := make([]uint, 0, len(existingDomains))
		for _, domain := range existingDomains {
			existingDomainMap[domain.Name] = domain
			existingDomainIDs = append(existingDomainIDs, domain.ID)
		}

		// 步骤2.4: 找出需要创建的新域名
		var newDomains []models.Domain
		for _, detail := range req.Domains {
			if _, exists := existingDomainMap[detail.Name]; !exists {
				newDomains = append(newDomains, models.Domain{
					Name:        detail.Name,
					Description: detail.Description,
				})
			}
		}

		// 步骤2.5: 批量创建新域名（1次插入）
		if len(newDomains) > 0 {
			if err := tx.Create(&newDomains).Error; err != nil {
				log.Error().Err(err).Int("count", len(newDomains)).Msg("Failed to batch create domains")
				return err
			}
			newDomainsCount = len(newDomains) // 记录新创建的域名数量
			log.Info().Int("count", len(newDomains)).Msg("Domains created successfully")

			// 将新创建的域名也加入映射
			for _, domain := range newDomains {
				existingDomainMap[domain.Name] = domain
				existingDomainIDs = append(existingDomainIDs, domain.ID)
			}
		}

		// 步骤2.6: 批量查询已存在的关联关系（1次查询）
		var existingAssocs []models.OrganizationDomain
		if len(existingDomainIDs) > 0 {
			if err := tx.Where("organization_id = ? AND domain_id IN ?", req.OrgID, existingDomainIDs).
				Find(&existingAssocs).Error; err != nil {
				log.Error().Err(err).Msg("Failed to query existing associations")
				return err
			}
		}

		// 步骤2.7: 构建已存在关联的映射（domain_id -> bool）
		existingAssocMap := make(map[uint]bool)
		for _, assoc := range existingAssocs {
			existingAssocMap[assoc.DomainID] = true
		}

		// 步骤2.8: 找出需要创建的新关联并构建结果列表
		var newAssocs []models.OrganizationDomain
		for _, detail := range req.Domains {
			domain := existingDomainMap[detail.Name]

			// 如果该域名未关联到组织，添加到待创建列表
			if !existingAssocMap[domain.ID] {
				newAssocs = append(newAssocs, models.OrganizationDomain{
					OrganizationID: req.OrgID,
					DomainID:       domain.ID,
				})
			}

			// 添加到结果列表（保持请求顺序）
			resultDomains = append(resultDomains, domain)
		}

		// 步骤2.9: 批量创建新关联（1次插入）
		if len(newAssocs) > 0 {
			if err := tx.Create(&newAssocs).Error; err != nil {
				log.Error().Err(err).Int("count", len(newAssocs)).Msg("Failed to batch create associations")
				return err
			}
			log.Info().
				Uint("organization_id", req.OrgID).
				Int("count", len(newAssocs)).
				Msg("Associations created successfully")
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Info().
		Uint("organization_id", req.OrgID).
		Int("total_domains", len(resultDomains)).
		Int("new_domains", newDomainsCount).
		Msg("Domains created and associated successfully")

	return resultDomains, nil
}

// GetDomainByID 根据ID获取域名信息（不包含子域名）
func (s *DomainService) GetDomainByID(id uint) (*models.Domain, error) {

	var domain models.Domain

	result := s.db.First(&domain, "id = ?", id)
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

// UpdateDomain 更新域名信息
//
// 业务逻辑说明：
// 1. 验证域名是否存在
// 2. 更新域名的名称和描述
// 3. 返回更新后的域名信息
//
// 注意事项：
// - 只能更新名称和描述，不能修改ID和时间戳
// - 名称修改后需要保证唯一性
// - 更新操作会自动更新 updated_at 字段
func (s *DomainService) UpdateDomain(req models.UpdateDomainRequest) (*models.Domain, error) {
	// 步骤1: 验证域名是否存在
	var domain models.Domain
	if err := s.db.First(&domain, "id = ?", req.ID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Error().Uint("domain_id", req.ID).Msg("Domain not found")
			return nil, errors.ErrDomainNotFound
		}
		log.Error().Err(err).Msg("Failed to query domain")
		return nil, err
	}

	// 步骤2: 更新域名信息
	// 只更新非空字段，保持灵活性
	updateData := make(map[string]interface{})
	if req.Name != "" {
		updateData["name"] = req.Name
	}
	if req.Description != "" {
		updateData["description"] = req.Description
	}

	// 如果没有任何更新字段，直接返回原域名
	if len(updateData) == 0 {
		log.Info().Uint("domain_id", req.ID).Msg("No fields to update")
		return &domain, nil
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

	// 构建安全的排序子句（防止 SQL 注入）
	orderClause := s.buildOrderClause(req.SortBy, req.SortOrder)

	// 执行分页查询，支持动态排序
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
func (s *DomainService) RemoveOrganizationDomain(req models.RemoveOrgDomainRequest) error {

	// 使用事务确保数据一致性：关联解除和孤儿域名删除要么全部成功，要么全部回滚
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 验证组织是否存在
		var org models.Organization
		if err := tx.First(&org, "id = ?", req.OrgID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Error().Uint("organization_id", req.OrgID).Msg("Organization not found")
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
			return errors.ErrAssociationNotFound
		}

		// 步骤4: 使用 GORM 的 Association 方法删除关联
		// Association().Delete() 会自动处理中间表，比手动 DELETE 更安全
		if err := tx.Model(&org).Association("Domains").Delete(&domain); err != nil {
			log.Error().Err(err).Msg("Failed to delete association")
			return err
		}

		log.Info().
			Uint("organization_id", req.OrgID).
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
