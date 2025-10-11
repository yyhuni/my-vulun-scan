package services

import (
	"errors"
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
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

	// 预分配结果切片容量，避免动态扩容
	resultDomains := make([]models.Domain, 0, len(req.Domains))
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
		// 预估容量：最多不超过请求的域名数量
		newDomains := make([]models.Domain, 0, len(req.Domains))
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

			// 步骤2.5.1: 为每个新创建的域名自动创建根子域名
			// 预分配切片容量，避免动态扩容带来的性能开销
			rootSubdomains := make([]models.SubDomain, 0, len(newDomains))
			for _, domain := range newDomains {
				rootSubdomains = append(rootSubdomains, models.SubDomain{
					Name:     domain.Name, // 根子域名与域名同名
					DomainID: domain.ID,
				})
			}

			// 批量创建根子域名
			if err := tx.Create(&rootSubdomains).Error; err != nil {
				log.Error().Err(err).Int("count", len(rootSubdomains)).Msg("Failed to create root subdomains")
				return err
			}
			log.Info().Int("count", len(rootSubdomains)).Msg("Root subdomains created successfully")

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
		// 预估容量：最多不超过请求的域名数量
		newAssocs := make([]models.OrganizationDomain, 0, len(req.Domains))
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

// GetDomainByID 根据ID获取域名信息（不包含组织信息）
func (s *DomainService) GetDomainByID(id uint) (*models.DomainResponseData, error) {

	var domain models.Domain

	result := s.db.First(&domain, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, customErrors.ErrDomainNotFound
		}
		log.Error().Err(result.Error).Msg("Failed to query domain")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Domain retrieved successfully")

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
		updateData["name"] = *req.Name
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

	// 构建安全的排序子句（防止 SQL 注入）
	orderClause := s.buildOrderClause(req.SortBy, req.SortOrder)

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
// 1. 循环处理每个域名，调用单个删除逻辑
// 2. 统计成功和失败的数量
// 3. 每个域名的删除是独立的事务
//
// 注意事项：
// - 每个域名的删除是独立的事务，一个失败不影响其他
// - 如果某个域名不存在或关联不存在，会记录为失败但继续处理其他域名
// - 如果域名成为孤儿会自动删除（由单个删除逻辑处理）
func (s *DomainService) BatchDeleteDomainsFromOrganization(req models.BatchDeleteDomainsRequest) (int, int, error) {
	successCount := 0
	failedCount := 0

	for _, domainID := range req.DomainIDs {
		// 构建单个删除请求
		deleteReq := models.DeleteDomainRequest{
			OrgID:    req.OrgID,
			DomainID: domainID,
		}

		// 调用单个删除逻辑（内部会自动处理孤儿域名删除）
		err := s.DeleteDomainFromOrganization(deleteReq)
		if err != nil {
			log.Error().
				Uint("organization_id", req.OrgID).
				Uint("domain_id", domainID).
				Err(err).
				Msg("Failed to delete domain from organization")
			failedCount++
			continue
		}

		successCount++
		log.Info().
			Uint("organization_id", req.OrgID).
			Uint("domain_id", domainID).
			Msg("Domain deleted from organization successfully")
	}

	if successCount == 0 && failedCount > 0 {
		return successCount, failedCount, errors.New("所有域名删除失败")
	}

	return successCount, failedCount, nil
}
