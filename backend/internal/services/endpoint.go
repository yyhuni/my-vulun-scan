package services

import (
	"fmt"
	"net/url"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"golang.org/x/net/publicsuffix"
	"gorm.io/gorm"
)

// EndpointService 端点服务
type EndpointService struct {
	db *gorm.DB
}

// NewEndpointService 创建端点服务实例
func NewEndpointService() *EndpointService {
	return &EndpointService{
		db: database.GetDB(),
	}
}

// GetEndpoints 获取所有端点列表
func (s *EndpointService) GetEndpoints(req models.GetEndpointsRequest) (*models.GetEndpointsResponse, error) {
	// 先计算总数（使用独立的查询）
	var total int64
	if err := s.db.Model(&models.Endpoint{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count endpoints")
		return nil, err
	}

	// 构建数据查询
	query := s.db.Model(&models.Endpoint{}).
		Preload("Domain").
		Preload("Subdomain")

	// 构建安全的排序子句
	orderClause := s.buildOrderClause(req.SortBy, req.SortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (req.Page - 1) * req.PageSize
	query = query.Offset(offset).Limit(req.PageSize)

	// 执行查询
	var endpoints []models.Endpoint
	if err := query.Find(&endpoints).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query endpoints")
		return nil, err
	}

	// 计算总页数
	totalPages := 0
	if req.PageSize > 0 {
		totalPages = int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
	}

	response := &models.GetEndpointsResponse{
		Endpoints:  endpoints,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(endpoints)).
		Msg("Endpoints retrieved successfully")

	return response, nil
}

// buildOrderClause 构建安全的排序子句（仅接受下划线字段名）
func (s *EndpointService) buildOrderClause(sortBy, sortOrder string) string {
	// 允许排序的字段白名单（与数据库列一致，使用下划线命名）
	allowed := map[string]bool{
		"url":         true,
		"method":      true,
		"status_code": true,
		"created_at":  true,
		"updated_at":  true,
	}

	if !allowed[sortBy] {
		sortBy = "updated_at" // 默认按更新时间排序
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc" // 默认降序
	}

	return fmt.Sprintf("%s %s", sortBy, sortOrder)
}

// GetEndpointByID 根据ID获取端点详情
func (s *EndpointService) GetEndpointByID(id uint) (*models.Endpoint, error) {
	var endpoint models.Endpoint
	result := s.db.First(&endpoint, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			log.Warn().Uint("id", id).Msg("Endpoint not found")
			return nil, customErrors.ErrEndpointNotFound
		}
		log.Error().Err(result.Error).Uint("id", id).Msg("Failed to get endpoint by ID")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Str("url", endpoint.URL).Msg("Endpoint retrieved successfully")
	return &endpoint, nil
}

// CreateEndpoints 批量创建端点，从 URL 自动提取 domain 和 subdomain（必须预先存在）
func (s *EndpointService) CreateEndpoints(req models.CreateEndpointsRequest) (*models.CreateEndpointsResponse, error) {
	var createdCount int
	var existingEndpoints []string

	log.Info().
		Int("total_requested", len(req.Endpoints)).
		Msg("Starting to create endpoints with auto domain/subdomain lookup")

	// 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 从 URL 提取所有唯一的 host 和根域名
		domainMap := make(map[string]uint)    // rootDomain -> domain_id
		subdomainMap := make(map[string]uint) // host -> subdomain_id
		hostToDomain := make(map[string]string) // host -> rootDomain

		for _, detail := range req.Endpoints {
			// 解析 URL 提取 host
			host, err := extractHostFromURL(detail.URL)
			if err != nil {
				log.Warn().Err(err).Str("url", detail.URL).Msg("Failed to extract host from URL, skipping")
				continue
			}

			// 从 host 提取根域名
			rootDomain := extractRootDomain(host)
			hostToDomain[host] = rootDomain

			// 如果该根域名还未处理，查询对应的 domain
			if _, exists := domainMap[rootDomain]; !exists {
				var domain models.Domain

				// 查询是否存在该域名
				err := tx.Where("name = ?", rootDomain).First(&domain).Error

				if err == gorm.ErrRecordNotFound {
					// 不存在，返回错误
					return fmt.Errorf("域名不存在: %s，请先创建该域名", rootDomain)
				} else if err != nil {
					log.Error().Err(err).Str("root_domain", rootDomain).Msg("Failed to query domain")
					return err
				}

				domainMap[rootDomain] = domain.ID
			}
		}

		// 2. 对每个唯一的 host，查询对应的 subdomain
		for host, rootDomain := range hostToDomain {
			if _, exists := subdomainMap[host]; !exists {
				domainID := domainMap[rootDomain]
				var subdomain models.SubDomain

				// 查询是否存在该子域名
				err := tx.Where("name = ? AND domain_id = ?", host, domainID).
					First(&subdomain).Error

				if err == gorm.ErrRecordNotFound {
					// 不存在，返回错误
					return fmt.Errorf("子域名不存在: %s（所属域名: %s），请先创建该子域名", host, rootDomain)
				} else if err != nil {
					log.Error().Err(err).Str("host", host).Msg("Failed to query subdomain")
					return err
				}

				subdomainMap[host] = subdomain.ID
			}
		}

		// 3. 批量查询现有端点，避免N+1问题
		var urls []string
		var methods []string
		for _, detail := range req.Endpoints {
			urls = append(urls, detail.URL)
			methods = append(methods, detail.Method)
		}

		var existingEndpointsInDB []models.Endpoint
		if err := tx.Model(&models.Endpoint{}).
			Where("url IN ? AND method IN ?", urls, methods).
			Find(&existingEndpointsInDB).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query existing endpoints")
			return err
		}

		// 4. 创建现有端点的映射，便于快速查找
		existingMap := make(map[string]bool)
		for _, existing := range existingEndpointsInDB {
			key := fmt.Sprintf("%s|%s", existing.URL, existing.Method)
			existingMap[key] = true
		}

		// 5. 准备需要创建的端点
		var newEndpoints []models.Endpoint
		for _, detail := range req.Endpoints {
			key := fmt.Sprintf("%s|%s", detail.URL, detail.Method)

			if existingMap[key] {
				// 已存在，记录到列表
				existingEndpoints = append(existingEndpoints, fmt.Sprintf("%s %s", detail.Method, detail.URL))
				log.Info().Str("url", detail.URL).Str("method", detail.Method).Msg("Endpoint already exists")
			} else {
				// 提取 host 获取 subdomain_id 和 domain_id
				host, err := extractHostFromURL(detail.URL)
				if err != nil {
					log.Warn().Err(err).Str("url", detail.URL).Msg("Skipping endpoint with invalid URL")
					continue
				}

				subdomainID, exists := subdomainMap[host]
				if !exists {
					log.Warn().Str("url", detail.URL).Str("host", host).Msg("Subdomain ID not found, skipping")
					continue
				}

				rootDomain := hostToDomain[host]
				domainID := domainMap[rootDomain]

				// 不存在，准备创建
				newEndpoint := models.Endpoint{
					URL:           detail.URL,
					Method:        detail.Method,
					StatusCode:    detail.StatusCode,
					Title:         detail.Title,
					ContentLength: detail.ContentLength,
					SubdomainID:   subdomainID,
					DomainID:      domainID,
				}
				newEndpoints = append(newEndpoints, newEndpoint)
			}
		}

		// 6. 批量创建新端点
		if len(newEndpoints) > 0 {
			if err := tx.CreateInBatches(newEndpoints, 100).Error; err != nil {
				log.Error().Err(err).Msg("Failed to create endpoints")
				return err
			}
			createdCount = len(newEndpoints)
			log.Info().Int("created_count", createdCount).Msg("Endpoints created successfully")
		}

		return nil
	})

	if err != nil {
		log.Error().Err(err).Msg("Transaction failed")
		return nil, err
	}

	response := &models.CreateEndpointsResponse{
		SuccessCount:      createdCount,
		ExistingEndpoints: existingEndpoints,
		TotalRequested:    len(req.Endpoints),
	}

	log.Info().
		Int("success_count", createdCount).
		Int("existing_count", len(existingEndpoints)).
		Int("total_requested", len(req.Endpoints)).
		Msg("Endpoints creation completed")

	return response, nil
}

// GetEndpointsBySubdomainID 获取子域名下的端点列表
func (s *EndpointService) GetEndpointsBySubdomainID(subdomainID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetEndpointsResponse, error) {
	// 先计算总数（使用独立的查询）
	var total int64
	if err := s.db.Model(&models.Endpoint{}).Where("subdomain_id = ?", subdomainID).Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("subdomain_id", subdomainID).Msg("Failed to count endpoints by subdomain ID")
		return nil, err
	}

	// 构建数据查询
	query := s.db.Model(&models.Endpoint{}).
		Where("subdomain_id = ?", subdomainID).
		Preload("Domain").
		Preload("Subdomain")

	// 构建安全的排序子句
	orderClause := s.buildOrderClause(sortBy, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 执行查询
	var endpoints []models.Endpoint
	if err := query.Find(&endpoints).Error; err != nil {
		log.Error().Err(err).Uint("subdomain_id", subdomainID).Msg("Failed to query endpoints by subdomain ID")
		return nil, err
	}

	// 计算总页数
	totalPages := 0
	if pageSize > 0 {
		totalPages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}

	response := &models.GetEndpointsResponse{
		Endpoints:  endpoints,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	log.Info().
		Uint("subdomain_id", subdomainID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(endpoints)).
		Msg("Endpoints by subdomain ID retrieved successfully")

	return response, nil
}

// extractHostFromURL 从 URL 中提取 host（包含端口）
// 例如: https://api.example.com:8080/path -> api.example.com:8080
func extractHostFromURL(rawURL string) (string, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	// 使用 Hostname() 获取不包含端口的主机名
	host := parsedURL.Hostname()
	if host == "" {
		return "", fmt.Errorf("URL has no host")
	}
	return host, nil
}

// extractRootDomain 使用 Public Suffix List 提取可注册的根域名（eTLD+1）
// 例如:
//   api.example.com -> example.com
//   www.example.co.uk -> example.co.uk
//   example.com -> example.com
// 若解析失败则回退返回原 host
func extractRootDomain(host string) string {
	if etld1, err := publicsuffix.EffectiveTLDPlusOne(host); err == nil {
		return etld1
	}
	// 回退：直接返回原始 host（例如 IP 或非标准域名）
	return host
}
