package main

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"vulun-scan-backend/config"
	"vulun-scan-backend/internal/middleware"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/pkg/database"
	"vulun-scan-backend/routes"

	// Swagger
	_ "vulun-scan-backend/docs"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// @title Vulun Scan Backend API
// @version 1.0
// @description 漏洞扫描系统后端 API 文档
// @BasePath /api/v1
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

	// 使用中间件（顺序很重要！）
	r.Use(gin.Recovery())         // 1. 恢复 panic
	r.Use(middleware.RequestID()) // 2. 生成 Request ID（必须在 Logger 之前）
	r.Use(middleware.Logger())    // 3. 记录日志（使用 Request ID）
	r.Use(middleware.CORS())      // 4. CORS

	// ========== 基础设施路由（系统级，非业务逻辑） ==========
	// 设置文档、健康检查等系统级路由
	routes.SetupInfrastructureRoutes(r)

	// API 路由组
	api := r.Group("/api/v1")
	{
		routes.SetupRoutes(api)
	}

	// 默认路由 - 使用统一的结构化响应
	r.NoRoute(func(c *gin.Context) {
		response.NotFoundResponse(c, "路由不存在")
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
