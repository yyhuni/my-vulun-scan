package routes

import (
	"net/http"
	"vulun-scan-backend/internal/handlers"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SetupInfrastructureRoutes 设置基础设施路由
// @Summary 设置基础设施路由
// @Description 设置系统级路由，包括文档、健康检查等非业务逻辑路由
func SetupInfrastructureRoutes(r *gin.Engine) {
	// Swagger JSON 文档（供 Scalar 使用）
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Scalar API 文档界面（主要文档入口）
	r.GET("/docs", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, getScalarHTML())
	})

	// 根路径重定向到文档
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/docs")
	})

	// 健康检查路由（使用统一响应结构）
	r.GET("/health", handlers.HealthCheck)
}

// getScalarHTML 返回 Scalar 文档的 HTML
func getScalarHTML() string {
	return `<!DOCTYPE html>
<html>
<head>
  <title>Vulun Scan API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <!-- Scalar API Reference -->
  <script
    id="api-reference"
    data-url="/swagger/doc.json"
    data-configuration='{
      "theme": "purple",
      "darkMode": true,
      "layout": "modern",
      "showSidebar": true,
      "hideModels": false,
      "hideDownloadButton": false,
      "searchHotKey": "k"
    }'>
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
}
