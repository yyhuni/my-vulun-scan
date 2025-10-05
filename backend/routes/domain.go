package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupDomainRoutes 设置域名相关路由
// @Summary 设置域名路由
// @Description 配置所有域名管理相关的API路由
func SetupDomainRoutes(api *gin.RouterGroup) {
	domains := api.Group("/domains")
	{
		// 批量创建域名 - 支持一次创建多个域名并关联到指定组织
		// 请求体示例：{
		//   "domains": [
		//     {"name": "example.com", "description": "主域名"},
		//     {"name": "test.com", "description": "测试域名"}
		//   ],
		//   "organization_id": 1
		// }
		domains.POST("/create", handlers.CreateDomains)

		// 获取域名信息 - 支持多种查询方式：
		// 1. 获取所有域名：GET /domains
		// 2. 按ID查询单个域名：GET /domains?id=1
		// 3. 按组织筛选：GET /domains?organization_id=1
		// 4. 分页查询：GET /domains?page=1&page_size=10
		// 5. 排序查询：GET /domains?sort_by=name&sort_order=asc
		// 6. 组合查询：GET /domains?organization_id=1&page=1&page_size=5&sort_by=created_at&sort_order=desc
		domains.GET("", handlers.GetDomains)

		// 解除组织与域名的关联 - 从组织中移除指定域名
		// 请求体示例：{"organization_id": 1, "domain_id": 2}
		domains.POST("/remove-from-organization", handlers.RemoveOrganizationDomain)
	}
}
