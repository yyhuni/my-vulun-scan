package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Logger 自定义日志中间件
func Logger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logrus.WithFields(logrus.Fields{
			"method":     param.Method,
			"path":       param.Path,
			"status":     param.StatusCode,
			"latency":    param.Latency,
			"ip":         param.ClientIP,
			"user_agent": param.Request.UserAgent(),
			"timestamp":  param.TimeStamp.Format(time.RFC3339),
		}).Info("API Request")

		return ""
	})
}
