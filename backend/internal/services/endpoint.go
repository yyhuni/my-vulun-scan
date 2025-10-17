package services

import (
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/utils"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	// 先计算总数
	var total int64
	if err := s.db.Model(&models.Endpoint{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count endpoints")
		return nil, err
	}

	// 构建数据查询
	query := s.db.Model(&models.Endpoint{})

	// 排序（统一：按更新时间倒序）
	query = query.Order("updated_at desc")

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
		Endpoints: endpoints,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
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
func (s *EndpointService) GetEndpointByID(id uint) (*models.GetEndpointByIDResponseData, error) {
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
	return &models.GetEndpointByIDResponseData{
		Endpoint: &endpoint,
	}, nil
}

// CreateEndpoints 批量创建端点，从 URL 自动提取并关联 domain 和 subdomain
func (s *EndpointService) CreateEndpoints(req models.CreateEndpointsRequest) (*models.CreateEndpointsResponseData, error) {
	var createdCount int
	var preparedCount int // 准备插入的端点数量（过滤掉无效 host 后）

	log.Info().
		Int("total_requested", len(req.Endpoints)).
		Msg("Starting to create endpoints with auto domain/subdomain lookup")

	// 0. Host 提取 + 请求内去重：只保留每个 URL 的第一次出现
	// 注意：URL 已在 Handler 层完成规范化和验证，此处信任输入数据
	type endpointWithHost struct {
		detail models.EndpointDetail
		host   string
	}

	urlMap := make(map[string]endpointWithHost)
	var duplicateInRequest int // 请求内重复的URL数量
	var extractHostErrors int  // 主机名提取失败的数量

	for _, detail := range req.Endpoints {
		// 提取 host（URL 已在 Handler 层规范化）
		host, err := utils.ExtractHostFromURL(detail.URL)
		if err != nil {
			log.Warn().Err(err).Str("url", detail.URL).Msg("Failed to extract host from URL, skipping")
			extractHostErrors++
			continue
		}

		// 使用 URL 进行去重
		if _, exists := urlMap[detail.URL]; !exists {
			urlMap[detail.URL] = endpointWithHost{
				detail: detail,
				host:   host,
			}
		} else {
			duplicateInRequest++
			log.Debug().Str("url", detail.URL).Msg("Duplicate URL detected")
		}
	}

	// 转换为切片（去重后的端点列表，包含缓存的 host）
	uniqueEndpoints := make([]endpointWithHost, 0, len(urlMap))
	for _, endpoint := range urlMap {
		uniqueEndpoints = append(uniqueEndpoints, endpoint)
	}

	if duplicateInRequest > 0 || extractHostErrors > 0 {
		log.Info().
			Int("duplicate_in_request", duplicateInRequest).
			Int("extract_host_errors", extractHostErrors).
			Int("unique_endpoints", len(uniqueEndpoints)).
			Msg("Host extraction and deduplication completed")
	}

	// 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 提取所有唯一的 host（直接使用缓存的 host，无需重复解析）
		uniqueHosts := make(map[string]bool)
		for _, endpoint := range uniqueEndpoints {
			uniqueHosts[endpoint.host] = true
		}

		// 2. 批量查询所有 host 对应的 Subdomain（每个 Domain 都会自动创建同名 Subdomain）
		var hosts []string
		for host := range uniqueHosts {
			hosts = append(hosts, host)
		}

		var subdomains []models.SubDomain
		if err := tx.Where("name IN ?", hosts).Find(&subdomains).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query subdomains")
			return err
		}

		// 3. 创建 host 到 subdomain_id 和 domain_id 的映射
		hostToSubdomainMap := make(map[string]struct {
			subdomainID uint
			domainID    uint
		})

		for _, subdomain := range subdomains {
			hostToSubdomainMap[subdomain.Name] = struct {
				subdomainID uint
				domainID    uint
			}{
				subdomainID: subdomain.ID,
				domainID:    subdomain.DomainID,
			}
			log.Debug().Str("host", subdomain.Name).Uint("subdomain_id", subdomain.ID).Uint("domain_id", subdomain.DomainID).Msg("Found subdomain for host")
		}

		// 4. 准备需要创建的端点（已去重，使用 OnConflict 处理数据库重复）
		var newEndpoints []models.Endpoint
		for _, endpoint := range uniqueEndpoints {
			// 直接使用缓存的 host，无需重复解析
			subdomainInfo, exists := hostToSubdomainMap[endpoint.host]
			if !exists {
				log.Warn().Str("url", endpoint.detail.URL).Str("host", endpoint.host).Msg("Host not found in domain/subdomain, skipping")
				continue
			}

			// 准备创建
			newEndpoint := models.Endpoint{
				URL:           endpoint.detail.URL,
				Method:        endpoint.detail.Method,
				StatusCode:    endpoint.detail.StatusCode,
				Title:         endpoint.detail.Title,
				ContentLength: endpoint.detail.ContentLength,
				SubdomainID:   subdomainInfo.subdomainID,
				DomainID:      subdomainInfo.domainID,
			}
			newEndpoints = append(newEndpoints, newEndpoint)
		}

		preparedCount = len(newEndpoints)

		// 5. 批量创建新端点，使用 OnConflict 自动跳过重复 URL
		// 优势：
		// - 避免竞态条件：数据库层面原子性处理冲突
		// - 提升性能：无需预查询已存在的 URL
		// - 简化代码：自动处理重复，无需手动过滤
		// - 幂等性：重复提交相同 URL 不会报错
		if preparedCount > 0 {
			result := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "url"}},
				DoNothing: true, // 遇到重复 URL 时跳过，不报错
			}).CreateInBatches(newEndpoints, 100)

			if result.Error != nil {
				log.Error().Err(result.Error).Msg("Failed to create endpoints")
				return result.Error
			}

			// RowsAffected 返回实际插入的行数（跳过的重复行不计入）
			createdCount = int(result.RowsAffected)
			log.Info().Int("created_count", createdCount).Int("total_prepared", preparedCount).Msg("Endpoints created successfully")
		}

		return nil
	})

	if err != nil {
		log.Error().Err(err).Msg("Transaction failed")
		return nil, err
	}

	// 计算统计信息
	totalRequested := len(req.Endpoints)
	alreadyExisted := preparedCount - createdCount

	// 构造消息
	message := fmt.Sprintf("成功创建 %d 个端点", createdCount)
	if alreadyExisted > 0 {
		message = fmt.Sprintf("成功创建 %d 个端点，%d 个已存在", createdCount, alreadyExisted)
	}

	response := &models.CreateEndpointsResponseData{
		BaseBatchCreateResponseData: models.BaseBatchCreateResponseData{
			Message:        message,
			TotalRequested: totalRequested,
			NewCreated:     createdCount,
			AlreadyExisted: alreadyExisted,
		},
	}

	log.Info().
		Str("message", message).
		Int("total_requested", totalRequested).
		Int("new_created", createdCount).
		Int("already_existed", alreadyExisted).
		Msg("Endpoints creation completed")

	return response, nil
}

// GetEndpointsByDomainID 获取域名下的端点列表（包括所有子域名的端点，固定按 updated_at desc 排序）
func (s *EndpointService) GetEndpointsByDomainID(domainID uint, page, pageSize int) (*models.GetEndpointsResponse, error) {
	// 先计算总数（使用独立的查询）
	var total int64
	if err := s.db.Model(&models.Endpoint{}).Where("domain_id = ?", domainID).Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to count endpoints by domain ID")
		return nil, err
	}

	// 构建数据查询
	query := s.db.Model(&models.Endpoint{}).
		Where("domain_id = ?", domainID)

	// 排序（统一：按更新时间倒序）
	query = query.Order("updated_at desc")

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 执行查询
	var endpoints []models.Endpoint
	if err := query.Find(&endpoints).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to query endpoints by domain ID")
		return nil, err
	}

	// 计算总页数
	totalPages := 0
	if pageSize > 0 {
		totalPages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}

	response := &models.GetEndpointsResponse{
		Endpoints: endpoints,
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
		Int("count", len(endpoints)).
		Msg("Endpoints by domain ID retrieved successfully")

	return response, nil
}

// GetEndpointsBySubdomainID 获取子域名下的端点列表（固定按 updated_at desc 排序）
func (s *EndpointService) GetEndpointsBySubdomainID(subdomainID uint, page, pageSize int) (*models.GetEndpointsResponse, error) {
	// 先计算总数（使用独立的查询）
	var total int64
	if err := s.db.Model(&models.Endpoint{}).Where("subdomain_id = ?", subdomainID).Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("subdomain_id", subdomainID).Msg("Failed to count endpoints by subdomain ID")
		return nil, err
	}

	// 构建数据查询
	query := s.db.Model(&models.Endpoint{}).
		Where("subdomain_id = ?", subdomainID)

	// 排序（统一：按更新时间倒序）
	query = query.Order("updated_at desc")

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
		Endpoints: endpoints,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
		},
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

// BatchDeleteEndpoints 批量删除端点
//
// 功能说明：
// 批量删除多个端点，通过事务保证原子性
//
// 业务规则：
// 1. 所有端点ID必须存在，否则返回错误
// 2. 关联的Vulnerabilities会自动级联删除（数据库外键约束）
// 3. 删除操作在事务中执行，保证原子性
//
// 级联删除说明：
// - Vulnerabilities: 端点删除后，关联的漏洞记录也会被删除
//
// 性能优化：
// - 在大规模数据场景下，去除预查询以提升性能
// - 通过 RowsAffected 验证删除数量，减少数据库查询次数
// - 不返回完整对象列表，只返回删除数量
//
// 参数：
//   - endpointIDs: 需要删除的端点ID列表
//
// 返回：
//   - int: 实际删除的端点数量
//   - error: 如果验证失败或删除失败则返回错误
func (s *EndpointService) BatchDeleteEndpoints(endpointIDs []uint) (int, error) {
	if len(endpointIDs) == 0 {
		return 0, customErrors.ErrEmptyEndpointIDs
	}

	var deletedCount int64

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 批量删除端点并检查影响行数
		// 数据库已配置 CASCADE，会自动删除关联的 Vulnerabilities
		result := tx.Where("id IN ?", endpointIDs).Delete(&models.Endpoint{})
		if result.Error != nil {
			log.Error().Err(result.Error).Msg("批量删除端点失败")
			return result.Error
		}

		deletedCount = result.RowsAffected

		// 检查删除的行数是否与请求的ID数量一致
		if deletedCount != int64(len(endpointIDs)) {
			log.Warn().
				Int("requested", len(endpointIDs)).
				Int64("deleted", deletedCount).
				Msg("部分端点ID不存在")
			return fmt.Errorf("%w: 请求删除 %d 个端点，实际删除 %d 个",
				customErrors.ErrPartialEndpointsNotFound, len(endpointIDs), deletedCount)
		}

		log.Info().
			Int64("count", deletedCount).
			Msg("端点批量删除成功")

		return nil
	})

	if err != nil {
		return 0, err
	}

	return int(deletedCount), nil
}
