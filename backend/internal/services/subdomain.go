package services

import (
	"fmt"
	"time"

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

// GetSubDomains 获取子域名列表
func (s *SubDomainService) GetSubDomains(req models.GetSubDomainsRequest) (*models.GetSubDomainsResponse, error) {
	time.Sleep(2 * time.Second) // 模拟延迟

	// 设置默认值
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

	// 构建查询
	query := s.db.Model(&models.SubDomain{}).Select(clause.Associations)

	// 如果指定了域名ID，添加筛选条件
	if req.DomainID > 0 {
		query = query.Where("domain_id = ?", req.DomainID)
	}

	// 如果指定了组织ID，通过关联查询筛选
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

// CreateSubDomains 创建子域名
func (s *SubDomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.CreateSubDomainsResponse, error) {
	time.Sleep(2 * time.Second) // 模拟延迟
	var createdCount int
	var existingDomains []string

	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, subDomainName := range req.SubDomains {
			// 检查子域名是否已存在于该主域名下
			var existingSubDomain models.SubDomain
			result := tx.Where("name = ? AND domain_id = ?", subDomainName, req.DomainID).First(&existingSubDomain)

			if result.Error == gorm.ErrRecordNotFound {
				// 子域名不存在，创建新的
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
				// 子域名已存在
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
	time.Sleep(2 * time.Second) // 模拟延迟
	
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
