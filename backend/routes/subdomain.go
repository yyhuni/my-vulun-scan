package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupSubDomainRoutes 设置子域名相关路由
// @Summary 设置子域名路由
// @Description 配置所有子域名管理相关的API路由
func SetupSubDomainRoutes(api *gin.RouterGroup) {
	subDomains := api.Group("/subdomains")
	{
		// 获取子域名信息 - 支持多种查询方式：
		// 1. 获取所有子域名：GET /subdomains
		// 2. 按ID查询单个子域名：GET /subdomains?id=1
		// 3. 按域名筛选：GET /subdomains?domain_id=1
		// 4. 按组织筛选：GET /subdomains?organization_id=1
		// 5. 分页查询：GET /subdomains?page=1&page_size=10
		// 6. 排序查询：GET /subdomains?sort_by=name&sort_order=asc
		// 7. 组合查询：GET /subdomains?organization_id=1&page=1&page_size=5&sort_by=created_at&sort_order=desc
		subDomains.GET("", handlers.GetSubDomains)

		// 批量创建子域名 - 支持一次创建多个子域名并关联到指定域名
		// 请求体示例：{"sub_domains": ["api.example.com", "www.example.com"], "domain_id": 1}
		subDomains.POST("/create", handlers.CreateSubDomains)
	}
}
