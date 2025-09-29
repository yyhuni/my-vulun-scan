package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupOrganizationRoutes 设置组织相关路由
func SetupOrganizationRoutes(api *gin.RouterGroup) {
	orgGroup := api.Group("/organizations")
	{
		// 基础组织操作
		orgGroup.GET("", handlers.GetOrganizations)
		orgGroup.POST("/create", handlers.CreateOrganization)
		orgGroup.GET("/:id", handlers.GetOrganizationByID)
		orgGroup.POST("/:id/update", handlers.UpdateOrganization)
		orgGroup.POST("/delete", handlers.DeleteOrganization)
		orgGroup.POST("/batch-delete", handlers.BatchDeleteOrganizations)
		orgGroup.GET("/search", handlers.SearchOrganizations)

		// 组织域名相关操作
		orgGroup.GET("/:id/domains", handlers.GetOrganizationDomains)
		orgGroup.POST("/remove-domain", handlers.RemoveOrganizationDomain)

		// 组织子域名相关操作
		orgGroup.GET("/:id/sub-domains", handlers.GetOrganizationSubDomains)
	}
}

// SetupDomainRoutes 设置域名相关路由
// 该函数定义了所有域名管理相关的API路由，包括CRUD操作和搜索功能
func SetupDomainRoutes(api *gin.RouterGroup) {
	domainGroup := api.Group("/domains")
	{
		// 获取域名详情 - 根据域名ID获取完整的域名信息
		domainGroup.GET("/:id", handlers.GetDomainByID)

		// 创建域名 - 支持批量创建域名并关联到组织
		domainGroup.POST("/create", handlers.CreateDomains)

		// 更新域名 - 更新域名信息，支持部分字段更新
		domainGroup.POST("/update", handlers.UpdateDomain)

		// 删除域名 - 删除单个域名及其所有关联关系
		domainGroup.POST("/delete", handlers.DeleteDomain)

		// 批量删除域名 - 支持同时删除多个域名
		domainGroup.POST("/batch-delete", handlers.BatchDeleteDomains)

		// 搜索域名 - 支持分页搜索和模糊匹配
		domainGroup.GET("/search", handlers.SearchDomains)
	}
}

// SetupAssetsRoutes 设置资产相关路由
func SetupAssetsRoutes(api *gin.RouterGroup) {
	assetsGroup := api.Group("/assets")
	{
		// 域名相关操作
		assetsGroup.POST("/domains/create", handlers.CreateDomains)

		// 子域名相关操作
		assetsGroup.POST("/sub-domains/create", handlers.CreateSubDomains)
	}
}

// SetupWorkflowRoutes 设置工作流相关路由（占位符）
func SetupWorkflowRoutes(api *gin.RouterGroup) {
	// 暂时保留空实现，后续可扩展
}

// SetupDashboardRoutes 设置仪表盘相关路由（占位符）
func SetupDashboardRoutes(api *gin.RouterGroup) {
	// 暂时保留空实现，后续可扩展
}
