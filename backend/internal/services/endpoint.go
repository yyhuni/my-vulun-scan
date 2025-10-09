package services

import (
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
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
	query := s.db.Model(&models.Endpoint{})

	// 拼接排序
	orderClause := req.SortBy + " " + req.SortOrder // 字符串拼接
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

// CreateEndpoints 批量创建端点
func (s *EndpointService) CreateEndpoints(req models.CreateEndpointsRequest) (*models.CreateEndpointsResponse, error) {
	var createdCount int
	var existingEndpoints []string

	log.Info().
		Int("total_requested", len(req.Endpoints)).
		Uint("subdomain_id", req.SubdomainID).
		Msg("Starting to create endpoints")

	// 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 批量查询现有端点，避免N+1问题
		var urls []string
		var methods []string
		for _, detail := range req.Endpoints {
			urls = append(urls, detail.URL)
			methods = append(methods, detail.Method)
		}

		var existingEndpointsInDB []models.Endpoint
		if err := tx.Model(&models.Endpoint{}).
			Where("url IN ? AND method IN ? AND subdomain_id = ?", urls, methods, req.SubdomainID).
			Find(&existingEndpointsInDB).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query existing endpoints")
			return err
		}

		// 2. 创建现有端点的映射，便于快速查找
		existingMap := make(map[string]bool)
		for _, existing := range existingEndpointsInDB {
			key := fmt.Sprintf("%s|%s", existing.URL, existing.Method)
			existingMap[key] = true
		}

		// 3. 准备需要创建的端点
		var newEndpoints []models.Endpoint
		for _, detail := range req.Endpoints {
			key := fmt.Sprintf("%s|%s", detail.URL, detail.Method)

			if existingMap[key] {
				// 已存在，记录到列表
				existingEndpoints = append(existingEndpoints, fmt.Sprintf("%s %s", detail.Method, detail.URL))
				log.Info().Str("url", detail.URL).Str("method", detail.Method).Msg("Endpoint already exists")
			} else {
				// 不存在，准备创建
				newEndpoint := models.Endpoint{
					URL:           detail.URL,
					Method:        detail.Method,
					StatusCode:    detail.StatusCode,
					Title:         detail.Title,
					ContentLength: detail.ContentLength,
					SubdomainID:   req.SubdomainID,
				}
				newEndpoints = append(newEndpoints, newEndpoint)
			}
		}

		// 4. 批量创建新端点
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
	query := s.db.Model(&models.Endpoint{}).Where("subdomain_id = ?", subdomainID)

	// 应用排序
	query = query.Order(fmt.Sprintf("%s %s", sortBy, sortOrder))

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
