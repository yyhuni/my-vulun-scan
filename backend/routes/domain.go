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
		// 创建域名
		domains.POST("/create", handlers.CreateDomains)
		
		// 获取域名详情
		domains.GET("/:id", handlers.GetDomainByID)
		
		// 更新域名
		domains.POST("/update", handlers.UpdateDomain)
		
		// 删除域名
		domains.POST("/delete", handlers.DeleteDomain)
		
		// 批量删除域名
		domains.POST("/batch-delete", handlers.BatchDeleteDomains)
		
		// 搜索域名
		domains.GET("/search", handlers.SearchDomains)
	}
}
