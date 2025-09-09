package main

import (
	"net/http"
	"strconv"
	"time"

	"vulun-scan-backend/config"
	"vulun-scan-backend/internal/middleware"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"
	"vulun-scan-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func main() {
	// 加载配置
	cfg := config.GetConfig()

	// 初始化日志
	setupLogger()

	// 初始化数据库
	database.InitDB()

	// 运行数据库迁移
	runMigrations()

	// 创建 Gin 引擎
	r := setupRouter()

	// 启动服务器
	startServer(r, cfg)
}

func setupLogger() {
	logrus.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
	})
	logrus.SetLevel(logrus.InfoLevel)
	logrus.Info("Starting Vulun Scan Backend Server...")
}

func setupRouter() *gin.Engine {
	// 加载配置以获取模式设置
	cfg := config.GetConfig()

	// 设置 Gin 模式
	if cfg.Server.Mode == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建 Gin 引擎
	r := gin.New()

	// 使用中间件
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(middleware.Logger())

	// 健康检查路由
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Unix(),
		})
	})

	// API 路由组
	api := r.Group("/api/v1")
	{
		routes.SetupOrganizationRoutes(api)
		routes.SetupScanRoutes(api)
		routes.SetupWorkflowRoutes(api)
		routes.SetupAssetsRoutes(api)
		routes.SetupDashboardRoutes(api)
	}

	// 默认路由
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
	})

	return r
}

// runMigrations 运行数据库迁移
func runMigrations() {
	logrus.Info("Running database migrations...")

	err := database.AutoMigrate(models.GetAllModels()...)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to run database migrations")
	}

	logrus.Info("Database migrations completed successfully")
}

func startServer(r *gin.Engine, cfg *config.Config) {
	port := strconv.Itoa(cfg.Server.Port)
	logrus.WithFields(logrus.Fields{
		"host": cfg.Server.Host,
		"port": port,
		"mode": cfg.Server.Mode,
	}).Info("Server starting...")

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logrus.WithError(err).Fatal("Failed to start server")
	}
}
