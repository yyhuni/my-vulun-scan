package routes

import (
	"time"

	"github.com/gin-gonic/gin"
)

// DelayMiddleware 模拟延迟中间件（开发环境使用）
func DelayMiddleware(duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		time.Sleep(duration)
		c.Next()
	}
}

// SetupRoutes 设置所有路由
// @Summary 设置所有路由
// @Description 初始化并设置所有API路由组
func SetupRoutes(api *gin.RouterGroup) {
	// 添加全局延迟中间件（模拟网络延迟，生产环境请注释掉）
	api.Use(DelayMiddleware(1 * time.Second))

	// 设置组织路由
	SetupOrganizationRoutes(api)

	// 设置域名路由
	SetupDomainRoutes(api)

	// 设置子域名路由
	SetupSubDomainRoutes(api)

	// 设置端点路由
	SetupEndpointRoutes(api)
}
