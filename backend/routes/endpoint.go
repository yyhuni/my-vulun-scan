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
		// 注意：如需按域名或子域名过滤，请使用专用路由 /domains/:id/endpoints 或 /subdomains/:id/endpoints
		endpoints.GET("", handlers.GetEndpoints)

		// 按ID查询单个端点
		// 示例：GET /endpoints/1
		endpoints.GET("/:id", handlers.GetEndpointByID)

		// 批量创建端点（自动从完整 URL 中提取域名/子域名，若不存在将跳过）
		// 请求体示例：{
		//   "endpoints": [
		//     {
		//       "url": "https://example.com/api/v1/users",
		//       "method": "GET",
		//       "status_code": 200,
		//       "title": "获取用户列表",
		//       "content_length": 1024
		//     }
		//   ]
		// }
		// 说明：
		// - 需要传入完整的 HTTP/HTTPS URL（例如 https://example.com/api/v1/users）
		// - 后端会自动解析 URL 提取 host/根域名并匹配已有的 domain/subdomain
		// - 不需要、也不支持手动传入 domain_id 或 subdomain_id；若匹配不到将跳过该条
		endpoints.POST("/create", handlers.CreateEndpoints)

		// 删除单个端点
		// 示例：DELETE /endpoints/1
		endpoints.DELETE("/:id", handlers.DeleteEndpoint)

		// 批量删除端点 - 支持一次删除多个端点
		// 请求体示例：{"endpoint_ids": [1, 2, 3]}
		endpoints.POST("/batch-delete", handlers.BatchDeleteEndpoints)
	}

	// 域名相关的端点路由
	domains := api.Group("/domains")
	{
		// 获取指定域名下的端点列表
		// 示例：GET /domains/1/endpoints?page=1&page_size=10&sort_by=created_at&sort_order=desc
		domains.GET("/:id/endpoints", handlers.GetEndpointsByDomainID)
	}

	// 子域名相关的端点路由
	subdomains := api.Group("/subdomains")
	{
		// 获取指定子域名下的端点列表
		// 示例：GET /subdomains/1/endpoints?page=1&page_size=10&sort_by=created_at&sort_order=desc
		subdomains.GET("/:id/endpoints", handlers.GetEndpointsBySubdomainID)
	}
}
