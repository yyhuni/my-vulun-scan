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

		// 获取域名列表，根据组织 ID
		domains.GET("/list", handlers.GetDomainsByOrgID)
	}
}
