package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupOrganizationRoutes 设置组织相关路由
func SetupOrganizationRoutes(r *gin.Engine) {
	orgGroup := r.Group("/organizations")
	{
		// 基础组织操作
		orgGroup.GET("", handlers.GetOrganizations)
		orgGroup.POST("/create", handlers.CreateOrganization)
		orgGroup.GET("/:id", handlers.GetOrganizationByID)
		orgGroup.POST("/:id/update", handlers.UpdateOrganization)
		orgGroup.POST("/delete", handlers.DeleteOrganization)
		orgGroup.POST("/batch-delete", handlers.BatchDeleteOrganizations)
		orgGroup.GET("/search", handlers.SearchOrganizations)

		// 组织主域名相关操作
		orgGroup.GET("/:id/main-domains", handlers.GetOrganizationMainDomains)
		orgGroup.POST("/remove-main-domain", handlers.RemoveOrganizationMainDomain)

		// 组织子域名相关操作
		orgGroup.GET("/:id/sub-domains", handlers.GetOrganizationSubDomains)

		// 组织漏洞相关操作
		orgGroup.GET("/:id/vulnerabilities", handlers.GetOrganizationVulnerabilities)
	}
}

// SetupScanRoutes 设置扫描相关路由
func SetupScanRoutes(r *gin.Engine) {
	scanGroup := r.Group("/scan")
	{
		// 组织扫描相关操作
		scanGroup.POST("/organizations/:id/start", handlers.StartOrganizationScan)
		scanGroup.GET("/organizations/:id/history", handlers.GetOrganizationScanHistory)
	}
}

// SetupAssetsRoutes 设置资产相关路由
func SetupAssetsRoutes(r *gin.Engine) {
	assetsGroup := r.Group("/assets")
	{
		// 主域名相关操作
		assetsGroup.POST("/main-domains/create", handlers.CreateMainDomains)

		// 子域名相关操作
		assetsGroup.POST("/sub-domains/create", handlers.CreateSubDomains)
	}
}

// SetupWorkflowRoutes 设置工作流相关路由（占位符）
func SetupWorkflowRoutes(r *gin.Engine) {
	// 暂时保留空实现，后续可扩展
}

// SetupDashboardRoutes 设置仪表盘相关路由（占位符）
func SetupDashboardRoutes(r *gin.Engine) {
	// 暂时保留空实现，后续可扩展
}
