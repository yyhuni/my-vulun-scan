package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// RequestID 中间件为每个请求生成唯一的 ID
// 支持从请求头中读取已有的 Request ID（便于分布式追踪）
// 或自动生成新的 UUID
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 尝试从请求头获取 Request ID
		requestID := c.GetHeader("X-Request-ID")

		// 如果请求头中没有，则生成新的 UUID
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// 设置响应头，方便前端追踪
		c.Header("X-Request-ID", requestID)

		// 存储到上下文，供后续使用
		c.Set("request_id", requestID)

		// 创建带 request_id 的 logger 并存入上下文
		logger := log.With().Str("request_id", requestID).Logger()
		c.Set("logger", &logger)

		c.Next()
	}
}
