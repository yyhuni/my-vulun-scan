package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Logger 自定义日志中间件（整合 Request ID）
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录开始时间
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 计算延迟
		latency := time.Since(start)

		// 获取带 request_id 的 logger（如果有）
		var logger *zerolog.Logger
		if loggerInterface, exists := c.Get("logger"); exists {
			logger = loggerInterface.(*zerolog.Logger)
		} else {
			// 如果没有 request_id，使用默认 logger
			defaultLogger := log.Logger
			logger = &defaultLogger
		}

		// 构建完整路径
		if raw != "" {
			path = path + "?" + raw
		}

		// 记录请求日志
		logger.Info().
			Str("method", c.Request.Method).
			Str("path", path).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent()).
			Msg("API Request")
	}
}
