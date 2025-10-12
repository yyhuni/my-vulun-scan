package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupSubDomainRoutes 设置子域名相关路由
// @Summary 设置子域名路由
// @Description 配置所有子域名管理相关的API路由
func SetupSubDomainRoutes(api *gin.RouterGroup) {
	subDomains := api.Group("/subdomains")
	{
		// 获取所有子域名列表 - 支持分页和排序
		// 示例：GET /subdomains?page=1&page_size=10&sort_by=name&sort_order=asc
		subDomains.GET("", handlers.GetSubDomains)

		// 按ID查询单个子域名
		// 示例：GET /subdomains/1
		subDomains.GET("/:id", handlers.GetSubDomainByID)

		// 删除单个子域名
		// 示例：DELETE /subdomains/1
		subDomains.DELETE("/:id", handlers.DeleteSubDomain)

		// 批量删除子域名 - 支持一次删除多个子域名
		// 请求体示例：{"subdomain_ids": [1, 2, 3]}
		subDomains.POST("/batch-delete", handlers.BatchDeleteSubDomains)
	}

	// 域名相关的子域名路由
	domains := api.Group("/domains")
	{
		// 获取域名的所有子域名列表
		// 示例：GET /domains/1/subdomains?page=1&page_size=10&sort_by=created_at&sort_order=desc
		domains.GET("/:id/subdomains", handlers.GetSubDomainsByDomainID)

		// 为指定域名批量创建子域名（新接口 - 简化版）
		// 示例：POST /domains/1/subdomains/create
		// 请求体：{"subdomains": ["www.example.com", "api.example.com", "admin.example.com"]}
		domains.POST("/:id/subdomains/create", handlers.CreateSubDomainsForDomain)
	}

	// 组织相关的子域名路由
	organizations := api.Group("/organizations")
	{
		// 获取组织的所有子域名列表（通过关联的域名查询）
		// 示例：GET /organizations/1/subdomains?page=1&page_size=10&sort_by=created_at&sort_order=desc
		organizations.GET("/:id/subdomains", handlers.GetSubDomainsByOrgID)
	}
}
