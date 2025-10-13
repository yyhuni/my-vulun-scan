package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// @Summary 设置端点路由
// @Description 配置所有端点管理相关的API路由
func SetupEndpointRoutes(api *gin.RouterGroup) {
	endpoints := api.Group("/endpoints")
	{
		// 获取所有端点列表 - 支持分页和排序
		// 示例：GET /endpoints?page=1&page_size=10&sort_by=created_at&sort_order=desc
		endpoints.GET("", handlers.GetEndpoints)

		// 按ID查询单个端点
		// 示例：GET /endpoints/1
		endpoints.GET("/:id", handlers.GetEndpointByID)

		// 批量创建端点 - 必须关联到指定的 Subdomain
		// 请求体示例：{
		//   "endpoints": [
		//     {"url": "/api/v1/users", "method": "GET", "status_code": 200, "title": "获取用户列表"},
		//   ],
		//   "subdomain_id": 2
		// }
		endpoints.POST("/create", handlers.CreateEndpoints)

		// 删除单个端点
		// 示例：DELETE /endpoints/1
		endpoints.DELETE("/:id", handlers.DeleteEndpoint)

		// 批量删除端点 - 支持一次删除多个端点
		// 请求体示例：{"endpoint_ids": [1, 2, 3]}
		endpoints.POST("/batch-delete", handlers.BatchDeleteEndpoints)
	}

	// 子域名相关的端点路由
	subdomains := api.Group("/subdomains")
	{
		// 获取指定子域名下的端点列表
		// 示例：GET /subdomains/1/endpoints?page=1&page_size=10&sort_by=created_at&sort_order=desc
		subdomains.GET("/:id/endpoints", handlers.GetEndpointsBySubdomainID)
	}
}
