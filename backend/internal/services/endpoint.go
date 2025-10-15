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

// CreateEndpoints 批量创建端点，从 URL 自动提取并关联 domain 和 subdomain
//
// 核心业务逻辑：
// 1. 从所有请求的 URL 中提取唯一的 host（如 baidu.com、media.baidu.com）
// 2. 批量查询这些 host 对应的 Subdomain 记录（因为系统设计：每个 Domain 都会自动创建同名 Subdomain）
// 3. 建立 host 到 (subdomain_id, domain_id) 的映射关系
// 4. 批量查询现有的 Endpoint 记录（基于 URL 去重，URL 是唯一标识）
// 5. 过滤掉已存在的 Endpoint 和找不到 Subdomain 的 Endpoint
// 6. 批量创建新的 Endpoint 记录
//
// 关键设计决策：
//   - URL 唯一性：Endpoint 的唯一标识是 URL，而不是 (URL + Method) 组合
//   - 精确匹配：优先精确匹配完整 host 到 Subdomain，避免跨域关联问题
//     例如：https://media.org20-primary.com/api 只会关联到 media.org20-primary.com 这个 Subdomain
//     不会错误关联到 org20-primary.com 或其他域名
//   - 自动跳过：如果 URL 的 host 在系统中不存在对应的 Subdomain，则自动跳过该 URL
//
// 幂等性保证：
// - 重复提交相同 URL 的 Endpoint 不会报错，只会记录到 ExistingEndpoints 列表
// - 返回值中包含成功创建数、已存在数、总请求数，便于调用方了解处理结果
//
// 数据一致性：
// - 使用事务确保批量创建的原子性，要么全部成功，要么全部回滚
// - SubdomainID 和 DomainID 都设置为 not null，确保 Endpoint 必定关联到有效的 Domain 和 Subdomain
//
// 性能优化：
// - 批量查询 Subdomain，避免 N+1 查询问题（1次查询代替 N 次）
// - 批量查询现有 Endpoint，避免逐个检查（1次查询代替 N 次）
// - 批量创建新 Endpoint，每批最多 100 条（1次插入代替 N 次）
// - 使用 map 结构快速查找，避免嵌套循环
//
// 注意事项：
// - 前提条件：Domain 创建时会自动创建同名 Subdomain（在 CreateDomains 方法中实现）
// - 如果需要创建子域名（如 media.baidu.com），需要先调用 CreateSubDomainsForDomain 接口
// - 事务失败会自动回滚，不会产生脏数据
func (s *EndpointService) CreateEndpoints(req models.CreateEndpointsRequest) (*models.CreateEndpointsResponseData, error) {
	var createdCount int
	var existingEndpoints []string

	log.Info().
		Int("total_requested", len(req.Endpoints)).
		Msg("Starting to create endpoints with auto domain/subdomain lookup")

	// 使用事务确保批量创建的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. 提取所有唯一的 host
		uniqueHosts := make(map[string]bool)
		for _, detail := range req.Endpoints {
			host, err := extractHostFromURL(detail.URL)
			if err != nil {
				log.Warn().Err(err).Str("url", detail.URL).Msg("Failed to extract host from URL, skipping")
				continue
			}
			uniqueHosts[host] = true
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
		hostInfo := make(map[string]struct {
			subdomainID uint
			domainID    uint
		})

		for _, subdomain := range subdomains {
			hostInfo[subdomain.Name] = struct {
				subdomainID uint
				domainID    uint
			}{
				subdomainID: subdomain.ID,
				domainID:    subdomain.DomainID,
			}
			log.Debug().Str("host", subdomain.Name).Uint("subdomain_id", subdomain.ID).Uint("domain_id", subdomain.DomainID).Msg("Found subdomain for host")
		}

		// 4. 记录未找到的 host（这些域名不在系统中）
		for host := range uniqueHosts {
			if _, found := hostInfo[host]; !found {
				log.Warn().Str("host", host).Msg("Subdomain not found in system, URLs with this host will be skipped")
			}
		}

		// 5. 批量查询现有端点
		var urls []string
		for _, detail := range req.Endpoints {
			urls = append(urls, detail.URL)
		}

		var existingEndpointsInDB []models.Endpoint
		if err := tx.Model(&models.Endpoint{}).
			Where("url IN ?", urls).
			Find(&existingEndpointsInDB).Error; err != nil {
			log.Error().Err(err).Msg("Failed to query existing endpoints")
			return err
		}

		// 6. 创建现有端点的映射，便于快速查找（只基于URL）
		existingMap := make(map[string]bool)
		for _, existing := range existingEndpointsInDB {
			existingMap[existing.URL] = true
		}

		// 7. 准备需要创建的端点
		var newEndpoints []models.Endpoint
		for _, detail := range req.Endpoints {
			if existingMap[detail.URL] {
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

				info, exists := hostInfo[host]
				if !exists {
					log.Warn().Str("url", detail.URL).Str("host", host).Msg("Host not found in domain/subdomain, skipping")
					continue
				}

				// 准备创建
				newEndpoint := models.Endpoint{
					URL:           detail.URL,
					Method:        detail.Method,
					StatusCode:    detail.StatusCode,
					Title:         detail.Title,
					ContentLength: detail.ContentLength,
					SubdomainID:   info.subdomainID,
					DomainID:      info.domainID,
				}
				newEndpoints = append(newEndpoints, newEndpoint)
			}
		}

		// 8. 批量创建新端点
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

	// 计算统计信息
	alreadyExisted := len(existingEndpoints)
	totalRequested := len(req.Endpoints)

	response := &models.CreateEndpointsResponseData{
		BaseBatchCreateResponseData: models.BaseBatchCreateResponseData{
			Message:        fmt.Sprintf("成功处理 %d 个端点，新创建 %d 个，%d 个已存在", totalRequested, createdCount, alreadyExisted),
			TotalRequested: totalRequested,
			NewCreated:     createdCount,
			AlreadyExisted: alreadyExisted,
		},
	}

	log.Info().
		Int("total_requested", totalRequested).
		Int("new_created", createdCount).
		Int("already_existed", alreadyExisted).
		Msg("Endpoints creation completed")

	return response, nil
}

// GetEndpointsByDomainID 获取域名下的端点列表（包括所有子域名的端点）
func (s *EndpointService) GetEndpointsByDomainID(domainID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetEndpointsResponse, error) {
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

// extractHostFromURL 从 URL 中提取主机名（不含端口）
// 例如: https://api.example.com:8080/path -> api.example.com
func extractHostFromURL(rawURL string) (string, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	if host := u.Hostname(); host == "" {
		return "", fmt.Errorf("URL has no host")
	}
	return u.Hostname(), nil
}

// extractRootDomain 使用 Public Suffix List 提取可注册的根域名（eTLD+1）
// 例如:
//
//	api.example.com -> example.com
//	www.example.co.uk -> example.co.uk
//	example.com -> example.com
//
// 若解析失败则回退返回原 host
func extractRootDomain(host string) string {
	if etld1, err := publicsuffix.EffectiveTLDPlusOne(host); err == nil {
		return etld1
	}
	// 回退：直接返回原始 host（例如 IP 或非标准域名）
	return host
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
