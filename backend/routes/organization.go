package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupOrganizationRoutes 设置组织相关路由
// @Summary 设置组织路由
// @Description 配置所有组织管理相关的API路由
func SetupOrganizationRoutes(api *gin.RouterGroup) {
	organizations := api.Group("/organizations")
	{
		// 获取组织列表 - 支持分页和排序
		// 示例：GET /organizations?page=1&page_size=10&sort_by=name&sort_order=asc
		organizations.GET("", handlers.GetOrgs)

		// 获取单个组织详情
		// 示例：GET /organizations/1
		organizations.GET("/:id", handlers.GetOrgByID)

		// 创建单个组织
		// 请求体示例：{"name": "测试组织", "description": "组织描述"}
		organizations.POST("/create", handlers.CreateOrg)

		// 更新组织信息 - 支持更新名称和描述
		// 请求体示例：{"id": 1, "name": "新名称", "description": "新描述"}
		organizations.POST("/update", handlers.UpdateOrg)

		// 删除单个组织 - 会级联删除相关的域名关联（待实现完善）
		// 请求体示例：{"id": 1}
		organizations.POST("/delete", handlers.DeleteOrganization)

		// 批量删除组织 - 支持一次删除多个组织（待实现完善）
		// 请求体示例：{"organization_ids": [1, 2, 3]}
		organizations.POST("/batch-delete", handlers.BatchDeleteOrganizations)

		// 获取组织的域名列表
		// 示例：GET /organizations/1/domains?page=1&page_size=10&sort_by=name&sort_order=asc
		organizations.GET("/:id/domains", handlers.GetDomainsByOrgID)
	}
}
