package routes

import (
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

// SetupToolRoutes 设置工具相关路由
// @Summary 设置工具路由
// @Description 配置所有工具管理相关的API路由
func SetupToolRoutes(api *gin.RouterGroup) {
	// 工具分类路由
	categories := api.Group("/categories")
	{
		// 获取所有分类
		// 示例：GET /categories
		categories.GET("", handlers.GetCategories)
	}

	// 工具路由
	tools := api.Group("/tools")
	{
		// 获取工具列表 - 支持分页，固定按更新时间降序排列
		// 示例：GET /tools?page=1&page_size=10
		tools.GET("", handlers.GetTools)

		// 创建工具
		// 请求体示例：{"name": "Nuclei", "repo_url": "https://github.com/projectdiscovery/nuclei", "version": "v3.0.0", "description": "Fast and customisable vulnerability scanner", "category_names": ["vulnerability"]}
		tools.POST("/create", handlers.CreateTool)
	}
}
