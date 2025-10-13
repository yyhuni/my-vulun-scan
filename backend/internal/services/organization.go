package services

import (
	"fmt"

	"vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// OrganizationService 组织服务
type OrganizationService struct {
	db *gorm.DB
}

// NewOrganizationService 创建组织服务实例
func NewOrganizationService() *OrganizationService {
	return &OrganizationService{
		db: database.GetDB(),
	}
}

// GetOrgs 获取组织列表(支持分页和排序)
func (s *OrganizationService) GetOrgs(req models.GetOrgsRequest) (*models.GetOrgsResponse, error) {
	var organizations []models.Organization
	var total int64

	// 查询总数
	if err := s.db.Model(&models.Organization{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count organizations")
		return nil, err
	}

	// 计算总页数
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建排序字符串
	orderClause := "updated_at desc"

	// 分页查询，支持动态排序
	offset := (req.Page - 1) * req.PageSize
	result := s.db.Order(orderClause).Offset(offset).Limit(req.PageSize).Find(&organizations)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query organizations")
		return nil, result.Error
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(organizations)).
		Msg("Organizations retrieved successfully")

	return &models.GetOrgsResponse{
		Organizations: organizations,
		Total:         total,
		Page:          req.Page,
		PageSize:      req.PageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetOrgByID 根据ID获取组织详细信息
func (s *OrganizationService) GetOrgByID(id uint) (*models.Organization, error) {

	var org models.Organization

	result := s.db.First(&org, "id = ?", id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, errors.ErrOrganizationNotFound
		}
		log.Error().Err(result.Error).Msg("Failed to query organization")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Msg("Organization retrieved successfully")
	return &org, nil
}

// CreateOrg 创建组织
func (s *OrganizationService) CreateOrg(req models.CreateOrgRequest) (*models.Organization, error) {

	org := models.Organization{
		Name:        req.Name,
		Description: req.Description,
	}

	result := s.db.Create(&org)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to create organization")
		return nil, result.Error
	}

	log.Info().
		Uint("id", org.ID).
		Str("name", org.Name).
		Msg("Organization created successfully")

	return &org, nil
}

// UpdateOrg 更新组织
func (s *OrganizationService) UpdateOrg(req models.UpdateOrgRequest) (*models.Organization, error) {

	var org models.Organization

	// 先查询是否存在
	result := s.db.First(&org, "id = ?", req.ID)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, errors.ErrOrganizationNotFound
		}
		log.Error().Err(result.Error).Msg("Failed to query organization for update")
		return nil, result.Error
	}

	// 更新字段
	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}

	result = s.db.Model(&org).Updates(updates)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to update organization")
		return nil, result.Error
	}

	log.Info().
		Uint("id", org.ID).
		Str("name", org.Name).
		Msg("Organization updated successfully")

	return &org, nil
}

// DeleteOrganization 删除组织
//
// 业务逻辑说明：
// 1. 预加载组织及其关联的所有域名
// 2. 删除组织记录（自动清理 organization_domains 关联）
// 3. 批量查询孤儿域名（删除组织后没有任何组织关联的域名）
// 4. 批量删除孤儿域名
//
// 核心逻辑 - 孤儿域名清理：
// - 删除组织后，某些域名可能不再被任何组织使用
// - 使用 SQL 子查询一次性找出所有孤儿域名（NOT EXISTS）
// - 批量删除孤儿域名，提高性能
//
// 使用 Select(clause.Associations) 的作用：
// - 自动识别并清理模型中定义的所有关联字段（如 Domains）
// - 相当于自动执行：Association("Domains").Clear()
// - 无需手动逐个清理关联，代码更简洁且易于维护
//
// 性能优化：
// - 使用原生 SQL 子查询批量查找孤儿域名，避免 N+1 查询问题
// - 批量删除而非逐个删除，减少数据库交互次数
//
// 事务保证：
// - 所有操作在事务中执行，确保数据一致性
// - 如果孤儿域名删除失败，整个删除操作会回滚
func (s *OrganizationService) DeleteOrganization(organizationID uint) error {

	return s.db.Transaction(func(tx *gorm.DB) error {
		var org models.Organization

		// 步骤1: 预加载关联的域名，以便后续检查孤儿域名
		if err := tx.Preload("Domains").First(&org, "id = ?", organizationID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.ErrOrganizationNotFound
			}
			log.Error().Err(err).Msg("Failed to query organization for deletion")
			return err
		}

		// 步骤2: 收集该组织关联的所有域名ID
		// 这些域名在组织删除后可能成为孤儿域名，需要检查
		domainIDs := make([]uint, len(org.Domains))
		for i, d := range org.Domains {
			domainIDs[i] = d.ID
		}

		// 步骤3: 删除组织记录
		// 数据库的 OnDelete:CASCADE 会自动清理 organization_domains 中间表
		res := tx.Delete(&org)
		if res.Error != nil {
			log.Error().Err(res.Error).Msg("Failed to delete organization")
			return res.Error
		}
		if res.RowsAffected == 0 {
			return fmt.Errorf("no rows affected during deletion")
		}

		// 步骤4: 批量查询孤儿域名（没有任何组织关联的域名）
		// 只检查刚才删除的组织原本关联的域名
		if len(domainIDs) > 0 {
			var orphanDomainIDs []uint
			// 使用 SQL 子查询一次性找出孤儿域名
			// NOT EXISTS 用于检查 organization_domains 表中是否还有关联记录
			// 性能优化：相比逐个查询，子查询方式只需一次数据库交互
			err := tx.Raw(`
				SELECT d.id 
				FROM domains d
				WHERE d.id IN (?)
				AND NOT EXISTS (
					SELECT 1 FROM organization_domains od 
					WHERE od.domain_id = d.id
				)
			`, domainIDs).Scan(&orphanDomainIDs).Error

			if err != nil {
				log.Error().Err(err).Msg("Failed to query orphan domains")
				return err
			}

			// 步骤5: 批量删除孤儿域名
			// 孤儿域名没有实际用途，应该被清理以保持数据库整洁
			if len(orphanDomainIDs) > 0 {
				if err := tx.Delete(&models.Domain{}, orphanDomainIDs).Error; err != nil {
					log.Error().Err(err).Msg("Failed to delete orphan domains")
					return err
				}
				log.Info().Int("count", len(orphanDomainIDs)).Msg("Orphan domains deleted")
			}
		}

		log.Info().Uint("id", organizationID).Msg("Organization deleted successfully")
		return nil
	})
}

// BatchDeleteOrganizations 批量删除组织
//
// 业务逻辑说明：
// 1. 验证所有组织是否存在
// 2. 预加载所有组织及其关联的域名
// 3. 批量删除组织（自动清理关联）
// 4. 批量查询并删除孤儿域名
//
// 与单个删除的区别：
// - 一次性处理多个组织，减少数据库交互
// - 收集所有组织的域名后，统一查询孤儿域名
// - 批量操作性能更好，但逻辑复杂度更高
//
// 事务保证：
// - 所有组织的删除要么全部成功，要么全部失败
// - 如果任何一个组织删除失败，整个批量操作回滚
// - 孤儿域名清理失败也会导致整个操作回滚
//
// 注意事项：
// - 必须确保所有传入的组织ID都存在，否则返回错误
// - 大数据场景优化：不预加载实体，基于中间表收集域名ID；仅返回删除数量
func (s *OrganizationService) BatchDeleteOrganizations(organizationIDs []uint) (int, error) {

	if len(organizationIDs) == 0 {
		return 0, fmt.Errorf("no organization IDs provided")
	}

	var deletedCount int64

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 基于中间表收集所有关联的域名ID（去重）
		var allDomainIDs []uint
		if err := tx.Table("organization_domains").
			Where("organization_id IN ?", organizationIDs).
			Distinct().Pluck("domain_id", &allDomainIDs).Error; err != nil {
			log.Error().Err(err).Msg("Failed to collect domain IDs from organization_domains")
			return err
		}

		// 步骤2: 批量清理 organization_domains 中间表关联
		if err := tx.Exec("DELETE FROM organization_domains WHERE organization_id IN ?", organizationIDs).Error; err != nil {
			log.Error().Err(err).Msg("Failed to delete organization-domain associations")
			return err
		}

		// 步骤3: 批量删除组织记录，并通过 RowsAffected 校验全部存在
		res := tx.Where("id IN ?", organizationIDs).Delete(&models.Organization{})
		if res.Error != nil {
			log.Error().Err(res.Error).Msg("Failed to batch delete organizations")
			return res.Error
		}
		deletedCount = res.RowsAffected
		if deletedCount != int64(len(organizationIDs)) {
			return errors.ErrSomeOrganizationsNotExist
		}

		// 步骤4: 批量查询并删除孤儿域名（没有任何组织关联的域名）
		if len(allDomainIDs) > 0 {
			var orphanDomainIDs []uint
			if err := tx.Raw(`
				SELECT d.id 
				FROM domains d
				WHERE d.id IN (?) 
				AND NOT EXISTS (
					SELECT 1 FROM organization_domains od 
					WHERE od.domain_id = d.id
				)
			`, allDomainIDs).Scan(&orphanDomainIDs).Error; err != nil {
				log.Error().Err(err).Msg("Failed to query orphan domains")
				return err
			}

			if len(orphanDomainIDs) > 0 {
				if err := tx.Delete(&models.Domain{}, orphanDomainIDs).Error; err != nil {
					log.Error().Err(err).Msg("Failed to delete orphan domains")
					return err
				}
				log.Info().Int("count", len(orphanDomainIDs)).Msg("Orphan domains deleted")
			}
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	log.Info().
		Int64("count", deletedCount).
		Msg("Organizations batch deleted successfully")

	return int(deletedCount), nil
}
