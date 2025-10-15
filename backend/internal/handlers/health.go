package handlers

import (
	"time"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"

	"github.com/gin-gonic/gin"
)

// HealthCheck 健康检查接口
// @Summary 健康检查
// @Description 检查服务是否正常运行
// @Tags 系统管理
// @Produce json
// @Success 200 {object} models.APIResponse{data=models.HealthStatusResponseData} "服务正常"
// @Router /health [get]
func HealthCheck(c *gin.Context) {
	response.SuccessResponse(c, models.HealthStatusResponseData{
		Status:    "ok",
		Timestamp: time.Now().Unix(),
	})
}
