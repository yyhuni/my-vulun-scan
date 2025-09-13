package main

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"vulun-scan-backend/config"
	"vulun-scan-backend/internal/middleware"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"
	"vulun-scan-backend/routes"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
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
	// 设置zerolog全局配置
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	// 默认使用控制台格式，方便开发调试
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	log.Info().Msg("Starting Vulun Scan Backend Server...")
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
	log.Info().Msg("Running database migrations...")

	err := database.AutoMigrate(models.GetAllModels()...)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to run database migrations")
	}

	log.Info().Msg("Database migrations completed successfully")
}

func startServer(r *gin.Engine, cfg *config.Config) {
	port := strconv.Itoa(cfg.Server.Port)
	log.Info().
		Str("host", cfg.Server.Host).
		Str("port", port).
		Str("mode", cfg.Server.Mode).
		Msg("Server starting...")

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal().Err(err).Msg("Failed to start server")
	}
}
