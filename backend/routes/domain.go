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

		// 获取单个域名详情
		// 示例：GET /domains/1
		domains.GET("/:id", handlers.GetDomainByID)

		// 更新域名信息 - 支持更新名称和描述
		// 请求体示例：{"id": 1, "name": "new-domain.com", "description": "新描述"}
		domains.POST("/update", handlers.UpdateDomain)

		// 解除组织与域名的关联 - 从组织中移除指定域名
		// 请求体示例：{"organization_id": 1, "domain_id": 2}
		domains.POST("/remove-from-organization", handlers.RemoveOrganizationDomain)
	}

	// 组织相关的域名路由
	organizations := api.Group("/organizations")
	{
		// 获取组织的域名列表
		// 示例：GET /organizations/1/domains?page=1&page_size=10&sort_by=name&sort_order=asc
		organizations.GET("/:id/domains", handlers.GetDomainsByOrgID)
	}
}
