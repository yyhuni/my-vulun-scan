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
		// 获取组织列表
		organizations.GET("", handlers.GetOrganizations)

		// 创建组织
		organizations.POST("/create", handlers.CreateOrganization)

		// 获取组织详情
		organizations.GET("/:id", handlers.GetOrganizationByID)

		// 更新组织
		organizations.POST("/:id/update", handlers.UpdateOrganization)

		// 删除组织
		organizations.POST("/delete", handlers.DeleteOrganization)

		// 批量删除组织
		organizations.POST("/batch-delete", handlers.BatchDeleteOrganizations)

	}
}
