package services

import (
	"fmt"

	"vulun-scan-backend/internal/models"
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

// GetSubDomains 获取子域名列表
//
// 业务逻辑说明：
// 1. 设置分页和排序的默认值
// 2. 根据请求参数构建动态查询条件
// 3. 支持三种查询模式：
//    a. 查询所有子域名（不指定任何ID）
//    b. 查询指定主域名的子域名（指定 domainID）
//    c. 查询指定组织的所有子域名（指定 organizationID，需要多表JOIN）
// 4. 执行分页查询并返回结果
//
// 查询逻辑详解：
// - 基础查询：sub_domains 表
// - 按域名筛选：直接通过 domain_id 字段
// - 按组织筛选：需要 JOIN domains 和 organization_domains 两张表
//   查询路径：sub_domains -> domains -> organization_domains -> organizations
//
// 性能考虑：
// - 使用 Preload 预加载关联数据，避免 N+1 查询问题
// - 组织级别查询会涉及多表JOIN，性能相对较低，建议添加索引
//
// 使用场景：
// - 主域名详情页：显示该域名下的所有子域名
// - 组织详情页：显示该组织所有主域名的子域名
func (s *SubDomainService) GetSubDomains(req models.GetSubDomainsRequest) (*models.GetSubDomainsResponse, error) {

	// 步骤1: 设置默认值，避免无效的分页和排序参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.SortBy == "" {
		req.SortBy = "updated_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	// 步骤2: 构建动态查询
	query := s.db.Model(&models.SubDomain{})

	// 步骤3a: 如果指定了主域名ID，直接通过 domain_id 筛选
	// 这是最常见的查询场景，性能最好
	if req.DomainID > 0 {
		query = query.Where("domain_id = ?", req.DomainID)
	}

	// 步骤3b: 如果指定了组织ID，需要通过多表JOIN筛选
	// 查询逻辑：找出组织的所有主域名，再找出这些主域名的所有子域名
	// 性能提示：这个查询涉及多表JOIN，建议为关联字段添加索引
	if req.OrganizationID > 0 {
		query = query.Joins("JOIN domains ON sub_domains.domain_id = domains.id").
			Joins("JOIN organization_domains ON domains.id = organization_domains.domain_id").
			Where("organization_domains.organization_id = ?", req.OrganizationID)
	}

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count sub domains")
		return nil, err
	}

	// 排序
	orderClause := fmt.Sprintf("%s %s", req.SortBy, req.SortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (req.Page - 1) * req.PageSize
	query = query.Offset(offset).Limit(req.PageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query sub domains")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("Sub domains retrieved successfully")

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

	var createdCount int
	var existingDomains []string

	// 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, subDomainName := range req.SubDomains {
			// 步骤1: 检查子域名是否已存在于该主域名下
			// 注意：同一个子域名名称可以属于不同的主域名
			// 所以查询条件必须包含 name + domain_id
			var existingSubDomain models.SubDomain
			result := tx.Where("name = ? AND domain_id = ?", subDomainName, req.DomainID).First(&existingSubDomain)

			if result.Error == gorm.ErrRecordNotFound {
				// 步骤2: 子域名不存在，创建新的子域名记录
				newSubDomain := models.SubDomain{
					Name:     subDomainName,
					DomainID: req.DomainID,
				}
				if err := tx.Create(&newSubDomain).Error; err != nil {
					log.Error().Err(err).Msg("Failed to create sub domain")
					return err
				}
				createdCount++
			} else if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to check existing sub domain")
				return result.Error
			} else {
				// 步骤3: 子域名已存在，记录到 existingDomains 列表
				// 这是幂等性的体现：已存在的子域名会被跳过而不是报错
				existingDomains = append(existingDomains, subDomainName)
			}
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
			return nil, fmt.Errorf("subdomain not found")
		}
		log.Error().Err(result.Error).Uint("id", id).Msg("Failed to get sub domain by ID")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Str("name", subDomain.Name).Msg("Sub domain retrieved successfully")
	return &subDomain, nil
}
