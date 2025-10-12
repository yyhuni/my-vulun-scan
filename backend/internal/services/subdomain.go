package services

import (
	"fmt"
	"strings"

	"vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/utils"
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

// GetSubDomains 获取所有子域名列表
func (s *SubDomainService) GetSubDomains(page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{})

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count all sub domains")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}

	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}

	orderClause := fmt.Sprintf("%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Msg("Failed to query all sub domains")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("All sub domains retrieved successfully")

	return response, nil
}

// GetSubDomainsByDomainID 根据域名ID获取子域名列表
func (s *SubDomainService) GetSubDomainsByDomainID(domainID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	query := s.db.Model(&models.SubDomain{}).Where("domain_id = ?", domainID)

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to count sub domains by domain")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}

	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}

	orderClause := fmt.Sprintf("%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Uint("domain_id", domainID).Msg("Failed to query sub domains by domain")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Uint("domain_id", domainID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("Sub domains by domain retrieved successfully")

	return response, nil
}

// GetSubDomainsByOrgID 根据组织ID获取子域名列表
func (s *SubDomainService) GetSubDomainsByOrgID(orgID uint, page, pageSize int, sortBy, sortOrder string) (*models.GetSubDomainsResponse, error) {
	// 通过多表JOIN查询组织的所有子域名
	query := s.db.Model(&models.SubDomain{}).
		Joins("JOIN domains ON sub_domains.domain_id = domains.id").
		Joins("JOIN organization_domains ON domains.id = organization_domains.domain_id").
		Where("organization_domains.organization_id = ?", orgID)

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		log.Error().Err(err).Uint("org_id", orgID).Msg("Failed to count sub domains by organization")
		return nil, err
	}

	// 排序字段映射（前端驼峰 -> 数据库下划线）
	sortFieldMap := map[string]string{
		"id":        "id",
		"name":      "name",
		"createdAt": "created_at",
		"updatedAt": "updated_at",
	}

	// 获取实际的数据库字段名
	dbSortField, exists := sortFieldMap[sortBy]
	if !exists {
		dbSortField = "updated_at" // 默认按更新时间排序
	}

	orderClause := fmt.Sprintf("sub_domains.%s %s", dbSortField, sortOrder)
	query = query.Order(orderClause)

	// 分页
	offset := (page - 1) * pageSize
	query = query.Offset(offset).Limit(pageSize)

	// 预加载关联数据
	query = query.Preload("Domain")

	// 执行查询
	var subDomains []models.SubDomain
	if err := query.Find(&subDomains).Error; err != nil {
		log.Error().Err(err).Uint("org_id", orgID).Msg("Failed to query sub domains by organization")
		return nil, err
	}

	response := &models.GetSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	log.Info().
		Uint("org_id", orgID).
		Int("page", page).
		Int("page_size", pageSize).
		Int64("total", total).
		Int("count", len(subDomains)).
		Msg("Sub domains by organization retrieved successfully")

	return response, nil
}

// CreateSubDomains 批量创建子域名
//
// 功能说明：
// 该方法接收多个域名分组（每个分组包含一个根域名和多个子域名），自动去重并批量创建子域名
//
// 处理流程：
// 1. 收集并去重：从请求中收集所有子域名，利用 map 自动去重（同一请求中重复的子域名只保留一个）
// 2. 验证根域名：检查所有根域名是否存在且已关联到指定组织，获取根域名ID映射
// 3. 构建插入映射：将「根域名→子域名」映射转换为「域名ID→子域名」映射，便于后续数据库操作
// 4. 过滤已存在：查询数据库中已存在的子域名，从待插入列表中移除（避免重复创建）
// 5. 收集插入记录：将映射转换为 SubDomain 模型数组
// 6. 批量插入：使用事务批量插入子域名到数据库（每批1000条）
//
// 参数：
//   - req: 创建请求，包含组织ID和域名分组列表
//
// 返回：
//   - *models.CreateSubDomainsResponse: 包含创建成功数量和总请求数量
//   - error: 如果根域名不存在或数据库操作失败则返回错误
//
// 特性：
//   - 自动去重：同一请求中的重复子域名只保留一个
//   - 跳过已存在：已存在的子域名不会重复创建
//   - 事务保证：批量插入使用数据库事务，保证原子性
//   - 性能优化：使用批量插入，每批处理1000条记录
func (s *SubDomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.CreateSubDomainsResponse, error) {
	// ===== 步骤1：收集并去重子域名 =====
	// 从请求的多个域名分组中收集所有子域名，利用 map 的键唯一性自动去重
	// 返回：rootToSubdomainsMap[根域名] = {子域名1, 子域名2, ...}
	//      totalUniqueSubdomains = 去重后的唯一子域名总数
	rootToSubdomainsMap, totalUniqueSubdomains := s.collectAndDedupeSubdomains(req.DomainGroups)
	
	// 如果没有任何有效的根域名（所有根域名都是空字符串），直接返回
	if len(rootToSubdomainsMap) == 0 {
		return &models.CreateSubDomainsResponse{
			TotalUniqueSubdomains: totalUniqueSubdomains, // 这里必然是0
		}, nil
	}

	// ===== 步骤2：验证并映射域名ID =====
	// 验证所有根域名是否存在且已关联到指定组织
	// 返回：domainNameToIDMap[根域名] = 域名ID, skippedDomains = 不存在或未关联的根域名列表
	// 注意：这里采用部分成功策略，即使部分根域名无效也继续处理有效的
	domainNameToIDMap, skippedDomains := s.validateAndMapDomains(rootToSubdomainsMap, req.OrganizationID)
	
	// 如果所有根域名都无效，直接返回
	if len(domainNameToIDMap) == 0 {
		return &models.CreateSubDomainsResponse{
			TotalUniqueSubdomains: totalUniqueSubdomains,
			SkippedDomains:        skippedDomains,
		}, nil
	}

	// ===== 步骤3：构建插入映射 =====
	// 将「根域名→子域名」映射转换为「域名ID→子域名」映射
	// 同时收集所有的域名ID和子域名（用于后续查询已存在的记录）
	domainToNewSubdomainsMap, allDomainIDs, subdomainNames := s.buildInsertionMap(rootToSubdomainsMap, domainNameToIDMap)

	// ===== 步骤4：过滤已存在的子域名 =====
	// 查询数据库中已存在的子域名，从 domainToNewSubdomainsMap 中移除这些记录
	// 这样可以避免重复创建，实现幂等性
	if err := s.filterExistingSubdomains(domainToNewSubdomainsMap, allDomainIDs, subdomainNames); err != nil {
		return nil, err
	}

	// ===== 步骤5：收集需要插入的记录 =====
	// 将映射转换为 SubDomain 模型数组，准备插入数据库
	subdomainsToInsert := s.collectSubdomainsToInsert(domainToNewSubdomainsMap)
	
	// 如果过滤后没有需要插入的记录（全部都已存在），直接返回
	if len(subdomainsToInsert) == 0 {
		return &models.CreateSubDomainsResponse{
			TotalUniqueSubdomains: totalUniqueSubdomains,
			SkippedDomains:        skippedDomains,
		}, nil
	}

	// ===== 步骤6：批量插入数据库 =====
	// 使用事务批量插入子域名，每批1000条记录
	totalRowsInserted, err := s.batchInsertSubdomains(subdomainsToInsert)
	if err != nil {
		return nil, err
	}

	// 返回创建结果
	return &models.CreateSubDomainsResponse{
		SubdomainsCreated:     int(totalRowsInserted),  // 实际创建的子域名数量
		TotalUniqueSubdomains: totalUniqueSubdomains,   // 去重后的唯一子域名总数
		SkippedDomains:        skippedDomains,          // 被跳过的根域名列表
	}, nil
}

// collectAndDedupeSubdomains 收集并去重所有域名分组（带子域名归属验证）
//
// 功能说明：
// 从请求中收集所有的根域名和子域名，自动过滤空字符串，并利用 map 的键唯一性实现去重
// **新增**：验证每个子域名是否真的属于指定的根域名，过滤掉无效的子域名
//
// 去重逻辑：
// - 同一个根域名在多个分组中出现，只保留一个
// - 同一个根域名下的重复子域名，只保留一个
// - 示例：[{"example.com": ["www", "www", "api"]}, {"example.com": ["www"]}]
//         结果：{"example.com": ["www", "api"]}
//
// 验证逻辑：
// - 验证子域名是否以 ".根域名" 结尾
// - 例如：www.example.com 是 example.com 的子域名 ✓
// - 例如：test.com 不是 example.com 的子域名 ✗
//
// 参数：
//   - domainGroups: 域名分组列表，每个分组包含根域名和子域名列表
//
// 返回：
//   - map[string]map[string]struct{}: 根域名到子域名集合的映射（使用 struct{} 实现集合，节省内存）
//   - int: 去重后的唯一子域名总数
func (s *SubDomainService) collectAndDedupeSubdomains(domainGroups []models.DomainGroup) (map[string]map[string]struct{}, int) {
	// 初始化结果映射：rootToSubdomainsMap[根域名] = {子域名1, 子域名2, ...}
	rootToSubdomainsMap := make(map[string]map[string]struct{})

	// 遍历所有域名分组
	for _, domainGroup := range domainGroups {
		// 清理根域名：去除首尾空格并转为小写
		rootDomain := strings.TrimSpace(strings.ToLower(domainGroup.RootDomain))
		if rootDomain == "" {
			continue // 跳过空的根域名
		}

		// 为根域名初始化子域名集合（如果还不存在）
		// 利用 map 的键唯一性实现根域名去重
		if _, exists := rootToSubdomainsMap[rootDomain]; !exists {
			rootToSubdomainsMap[rootDomain] = make(map[string]struct{})
		}

		// 遍历当前根域名下的所有子域名
		for _, sdname := range domainGroup.Subdomains {
			// 清理子域名：去除首尾空格并转为小写
			subdomainName := strings.TrimSpace(strings.ToLower(sdname))
			if subdomainName == "" {
				continue // 跳过空的子域名
			}
			
			// ===== 新增：验证子域名是否属于根域名 =====
			// 使用 IsSubdomainOf 检查子域名是否真的属于根域名
			if !utils.IsSubdomainOf(subdomainName, rootDomain) {
				// 记录警告日志，但不中断处理流程（跳过无效子域名）
				log.Warn().
					Str("root_domain", rootDomain).
					Str("invalid_subdomain", subdomainName).
					Msg("跳过无效子域名：不属于指定的根域名")
				continue // 跳过不属于根域名的子域名
			}
			
			// 将有效的子域名添加到集合中（map的键自动去重）
			// 如果子域名已存在，会被自动覆盖（值都是 struct{}）
			rootToSubdomainsMap[rootDomain][subdomainName] = struct{}{}
		}
	}

	// 计算去重后的唯一子域名总数
	totalUniqueSubdomains := 0
	for _, subdomainSet := range rootToSubdomainsMap {
		totalUniqueSubdomains += len(subdomainSet)
	}

	return rootToSubdomainsMap, totalUniqueSubdomains
}

// validateAndMapDomains 验证并映射域名ID（部分成功模式）
//
// 功能说明：
// 验证所有根域名是否存在于数据库中，并且已经关联到指定的组织
// 采用部分成功策略：即使部分根域名无效，也会返回有效的域名映射
//
// 验证规则：
// - 根域名必须在 domains 表中存在
// - 根域名必须通过 organization_domains 表关联到指定的组织
// - 无效的根域名会被记录到 skippedDomains 中，但不影响其他有效根域名的处理
//
// 参数：
//   - rootToSubdomainsMap: 根域名到子域名的映射
//   - orgID: 组织ID
//
// 返回：
//   - map[string]uint: 有效的域名名称到域名ID的映射
//   - []string: 被跳过的根域名列表（不存在或未关联组织）
func (s *SubDomainService) validateAndMapDomains(rootToSubdomainsMap map[string]map[string]struct{}, orgID uint) (map[string]uint, []string) {
	// 从 map 中提取所有根域名（用于 SQL IN 查询）
	rootDomains := make([]string, 0, len(rootToSubdomainsMap))
	for root := range rootToSubdomainsMap {
		rootDomains = append(rootDomains, root)
	}

	// 查询数据库：获取已关联到指定组织的域名记录
	// SQL: SELECT d.id, d.name FROM domains d
	//      JOIN organization_domains od ON od.domain_id = d.id
	//      WHERE LOWER(d.name) IN (...) AND od.organization_id = ?
	// 注意：使用 LOWER() 进行大小写不敏感查询，因为 collectAndDedupeSubdomains 已将域名转为小写
	var domains []models.Domain
	if err := s.db.Table("domains d").
		Select("d.id, d.name").
		Joins("JOIN organization_domains od ON od.domain_id = d.id").
		Where("LOWER(d.name) IN ? AND od.organization_id = ?", rootDomains, orgID).
		Find(&domains).Error; err != nil {
		// 数据库查询失败，返回空映射和所有根域名作为跳过列表
		log.Error().Err(err).Msg("查询根域名失败")
		return make(map[string]uint), rootDomains
	}

	// 构建域名名称到ID的映射（用于后续步骤）
	// 注意：将域名转为小写作为key，与 collectAndDedupeSubdomains 中的小写域名一致
	domainNameToIDMap := make(map[string]uint, len(domains))
	for _, domain := range domains {
		domainNameToIDMap[strings.ToLower(domain.Name)] = domain.ID
	}

	// 收集被跳过的根域名（不存在或未关联到组织）
	// 如果查询结果中没有某个根域名，说明它要么不存在，要么未关联到组织
	var skippedDomains []string
	for _, root := range rootDomains {
		if _, exists := domainNameToIDMap[root]; !exists {
			skippedDomains = append(skippedDomains, root)
		}
	}

	// 记录跳过的域名信息
	if len(skippedDomains) > 0 {
		log.Warn().
			Uint("organization_id", orgID).
			Strs("skipped_domains", skippedDomains).
			Msg("部分根域名不存在或未关联组织，已跳过")
	}

	// 返回有效的域名映射和跳过的域名列表
	return domainNameToIDMap, skippedDomains
}

// buildInsertionMap 构建待插入映射和全局子域名集合
//
// 功能说明：
// 将「根域名→子域名」映射转换为「域名ID→子域名」映射，并收集用于后续查询的数据
//
// 转换示例：
// 输入：rootToSubdomainsMap = {"example.com": ["www", "api"], "test.com": ["www"]}
//      domainNameToIDMap = {"example.com": 1, "test.com": 2}
// 输出：domainToSubdomains = {1: ["www", "api"], 2: ["www"]}
//      domainIDs = [1, 2]
//      subdomainNames = ["www", "api"] (所有唯一的子域名)
//
// 参数：
//   - rootToSubdomainsMap: 根域名到子域名的映射
//   - domainNameToIDMap: 域名名称到域名ID的映射
//
// 返回：
//   - map[uint]map[string]struct{}: 域名ID到子域名的映射（用于后续数据操作）
//   - []uint: 所有域名ID的列表（用于查询已存在的子域名）
//   - []string: 所有唯一子域名的列表（用于查询已存在的子域名）
func (s *SubDomainService) buildInsertionMap(
	rootToSubdomainsMap map[string]map[string]struct{},
	domainNameToIDMap map[string]uint,
) (map[uint]map[string]struct{}, []uint, []string) {
	// 初始化结果容器
	domainToSubdomains := make(map[uint]map[string]struct{}, len(rootToSubdomainsMap))
	domainIDs := make([]uint, 0, len(rootToSubdomainsMap))
	uniqueSubdomains := make(map[string]struct{}) // 用于收集所有唯一的子域名

	// 遍历所有根域名及其子域名
	for rootDomainName, subdomainSet := range rootToSubdomainsMap {
		// 获取根域名对应的数据库ID
		domainID, exists := domainNameToIDMap[rootDomainName]
		
		// ✅ 跳过无效的根域名（已在 validateAndMapDomains 中被过滤）
		if !exists || domainID == 0 {
			continue
		}
		
		// 收集域名ID（用于后续查询）
		domainIDs = append(domainIDs, domainID)
		
		// 为该域名ID创建子域名集合
		domainToSubdomains[domainID] = make(map[string]struct{}, len(subdomainSet))

		// 将子域名添加到对应的域名ID下，并收集到全局唯一子域名集合中
		for subdomainName := range subdomainSet {
			domainToSubdomains[domainID][subdomainName] = struct{}{}
			uniqueSubdomains[subdomainName] = struct{}{} // 收集所有唯一的子域名
		}
	}

	// 将 map 转换为数组（用于SQL IN 查询）
	subdomainNames := make([]string, 0, len(uniqueSubdomains))
	for name := range uniqueSubdomains {
		subdomainNames = append(subdomainNames, name)
	}

	return domainToSubdomains, domainIDs, subdomainNames
}

// filterExistingSubdomains 过滤已存在的子域名
//
// 功能说明：
// 查询数据库中已存在的子域名，并从待插入映射中移除这些记录
// 这样可以避免重复创建，实现接口的幂等性
//
// 查询逻辑：
// SQL: SELECT * FROM sub_domains WHERE domain_id IN (...) AND name IN (...)
// 这个查询会找出所有「域名ID + 子域名名称」的组合已存在的记录
//
// 参数：
//   - domainToNewSubdomainsMap: 待插入的子域名映射（会被原地修改）
//   - allDomainIDs: 所有域名ID的列表
//   - subdomainNames: 所有子域名的列表
//
// 返回：
//   - error: 如果数据库查询失败则返回错误
func (s *SubDomainService) filterExistingSubdomains(
	domainToNewSubdomainsMap map[uint]map[string]struct{},
	allDomainIDs []uint,
	subdomainNames []string,
) error {
	// 查询数据库中已存在的子域名记录
	// 使用 IN 查询同时匹配域名ID和子域名名称
	var existingSubdomains []models.SubDomain
	if err := s.db.Where("domain_id IN ? AND name IN ?", allDomainIDs, subdomainNames).Find(&existingSubdomains).Error; err != nil {
		return fmt.Errorf("查询已存在子域名失败: %w", err)
	}

	// 从待插入映射中移除已存在的记录（原地修改map）
	// 例如：如果数据库中已存在 {domain_id: 1, name: "www"}，则从 map[1] 中删除 "www"
	for _, existingSubdomain := range existingSubdomains {
		if subdomainSet, exists := domainToNewSubdomainsMap[existingSubdomain.DomainID]; exists {
			delete(subdomainSet, existingSubdomain.Name)
		}
	}

	return nil
}

// collectSubdomainsToInsert 收集需要插入的记录
//
// 功能说明：
// 将映射结构转换为 SubDomain 模型数组，准备插入数据库
//
// 转换示例：
// 输入：domainToNewSubdomainsMap = {1: ["www", "api"], 2: ["admin"]}
// 输出：[{Name: "www", DomainID: 1}, {Name: "api", DomainID: 1}, {Name: "admin", DomainID: 2}]
//
// 参数：
//   - domainToNewSubdomainsMap: 域名ID到子域名的映射
//
// 返回：
//   - []models.SubDomain: SubDomain 模型数组，可直接用于批量插入
func (s *SubDomainService) collectSubdomainsToInsert(domainToNewSubdomainsMap map[uint]map[string]struct{}) []models.SubDomain {
	var subdomainsToInsert []models.SubDomain

	// 遍历映射，构建 SubDomain 模型数组
	for domainID, subdomainSet := range domainToNewSubdomainsMap {
		for name := range subdomainSet {
			subdomainsToInsert = append(subdomainsToInsert, models.SubDomain{
				Name:     name,
				DomainID: domainID,
			})
		}
	}

	return subdomainsToInsert
}

// batchInsertSubdomains 批量插入子域名
//
// 功能说明：
// 使用事务批量插入子域名到数据库，每批处理1000条记录
// 使用 OnConflict{DoNothing: true} 策略，如果记录已存在则跳过（幂等性保证）
//
// 性能优化：
// - 使用数据库事务，保证原子性
// - 分批插入，避免单次插入数据量过大
// - 每批1000条记录，在性能和内存占用之间取得平衡
//
// 参数：
//   - subdomainsToInsert: 需要插入的子域名数组
//
// 返回：
//   - int64: 实际插入的记录数量
//   - error: 如果事务执行失败则返回错误
func (s *SubDomainService) batchInsertSubdomains(subdomainsToInsert []models.SubDomain) (int64, error) {
	var totalRowsInserted int64
	const batchSize = 1000 // 每批插入1000条记录

	// 使用事务确保原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 分批处理，避免单次插入数据量过大
		for i := 0; i < len(subdomainsToInsert); i += batchSize {
			// 计算当前批次的结束索引
			endIndex := i + batchSize
			if endIndex > len(subdomainsToInsert) {
				endIndex = len(subdomainsToInsert)
			}

			// 获取当前批次的数据
			batch := subdomainsToInsert[i:endIndex]
			
			// 批量插入，如果记录已存在则跳过（OnConflict{DoNothing}）
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&batch)
			if result.Error != nil {
				return result.Error // 事务会自动回滚
			}
			
			// 累加实际插入的记录数
			totalRowsInserted += result.RowsAffected
		}
		return nil
	})

	if err != nil {
		return 0, err
	}

	return totalRowsInserted, nil
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
			return nil, errors.ErrSubDomainNotFound
		}
		log.Error().Err(result.Error).Uint("id", id).Msg("Failed to get sub domain by ID")
		return nil, result.Error
	}

	log.Info().Uint("id", id).Str("name", subDomain.Name).Msg("Sub domain retrieved successfully")
	return &subDomain, nil
}

// BatchDeleteSubDomains 批量删除子域名
//
// 功能说明：
// 批量删除多个子域名，通过事务保证原子性
//
// 处理流程：
// 1. 验证所有子域名是否存在
// 2. 预加载子域名及其关联的域名信息
// 3. 批量删除子域名（GORM会自动级联删除关联的Endpoints和Vulnerabilities）
//
// 事务保证：
// - 所有子域名的删除要么全部成功，要么全部失败
// - 如果任何一个子域名删除失败，整个批量操作回滚
//
// 参数：
//   - subdomainIDs: 需要删除的子域名ID列表
//
// 返回：
//   - []models.SubDomain: 被删除的子域名列表（供前端确认）
//   - error: 如果验证失败或删除失败则返回错误
func (s *SubDomainService) BatchDeleteSubDomains(subdomainIDs []uint) ([]models.SubDomain, error) {
	if len(subdomainIDs) == 0 {
		return nil, fmt.Errorf("子域名ID列表不能为空")
	}

	var deletedSubDomains []models.SubDomain

	// 使用事务确保批量删除的原子性
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 步骤1: 验证所有子域名是否存在
		if err := tx.Where("id IN ?", subdomainIDs).Find(&deletedSubDomains).Error; err != nil {
			log.Error().Err(err).Msg("查询待删除子域名失败")
			return err
		}

		// 检查删除的子域名数量是否与请求的ID数量一致
		if len(deletedSubDomains) != len(subdomainIDs) {
			log.Warn().
				Int("requested", len(subdomainIDs)).
				Int("found", len(deletedSubDomains)).
				Msg("部分子域名ID不存在")
			return fmt.Errorf("部分子域名ID不存在")
		}

		// 步骤2: 批量删除子域名
		// 数据库已配置 CASCADE，会自动删除关联的 Endpoints 和 Vulnerabilities
		if err := tx.Where("id IN ?", subdomainIDs).Delete(&models.SubDomain{}).Error; err != nil {
			log.Error().Err(err).Msg("批量删除子域名失败")
			return err
		}

		log.Info().
			Int("count", len(subdomainIDs)).
			Msg("子域名批量删除成功")

		return nil
	})

	if err != nil {
		return nil, err
	}

	return deletedSubDomains, nil
}
