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
		// 获取所有域名列表 - 支持分页和排序
		// 示例：GET /domains?page=1&page_size=10&sort_by=name&sort_order=asc
		domains.GET("", handlers.GetAllDomains)

		// 批量创建域名 - 支持一次创建多个域名并关联到指定组织
		// 请求体示例：{
		//   "domains": [
		//     {"name": "example.com", "description": "主域名"},
		//     {"name": "test.com", "description": "测试域名"}
		//   ],
		//   "organization_id": 1
		// }
		domains.POST("/create", handlers.CreateDomains)

		// 获取单个域名详情
		// 示例：GET /domains/1
		domains.GET("/:id", handlers.GetDomainByID)

		// 更新域名信息 - 支持更新名称和描述
		// 请求体示例：{"id": 1, "name": "new-domain.com", "description": "新描述"}
		domains.POST("/update", handlers.UpdateDomain)

		// 批量删除域名 - 直接删除域名，不依赖组织（优化接口）
		// 请求体示例：{"domain_ids": [1, 2, 3, 4, 5]}
		// 注意：此接口会删除所有关联关系并删除域名本身
		domains.POST("/batch-delete", handlers.BatchDeleteDomainsDirect)
	}

	// 组织相关的域名路由
	organizations := api.Group("/organizations")
	{
		// 获取组织的域名列表
		// 示例：GET /organizations/1/domains?page=1&page_size=10&sort_by=name&sort_order=asc
		organizations.GET("/:id/domains", handlers.GetDomainsByOrgID)

		// 从组织中移除单个域名 - 解除关联关系，如果域名成为孤儿则自动删除
		// 示例：DELETE /organizations/1/domains/2
		organizations.DELETE("/:organization_id/domains/:domain_id", handlers.DeleteDomainFromOrganization)

		// 批量从组织中移除域名 - 支持一次移除多个域名
		// 请求体示例：{"organization_id": 1, "domain_ids": [1, 2, 3]}
		organizations.POST("/:organization_id/domains/batch-remove", handlers.BatchDeleteDomainsFromOrganization)
	}
}
