package routes

import (
	"github.com/gin-gonic/gin"
)

// SetupRoutes 设置所有路由
// @Summary 设置所有路由
// @Description 初始化并设置所有API路由组
func SetupRoutes(api *gin.RouterGroup) {
	// 设置组织路由
	SetupOrganizationRoutes(api)

	// 设置域名路由
	SetupDomainRoutes(api)

	// 设置子域名路由
	SetupSubDomainRoutes(api)
}
