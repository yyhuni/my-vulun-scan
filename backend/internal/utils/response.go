package utils

import (
	"net/http"

	"vulun-scan-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// SuccessResponse 成功响应
func SuccessResponse(c *gin.Context, data interface{}) {
	response := models.APIResponse{
		Code:    "SUCCESS",
		Message: "操作成功",
		Data:    data,
	}
	c.JSON(http.StatusOK, response)
}

// ErrorResponse 错误响应
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	response := models.APIResponse{
		Code:    "ERROR",
		Message: message,
	}
	c.JSON(statusCode, response)
}

// BadRequestResponse 请求错误响应
func BadRequestResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusBadRequest, message)
}

// NotFoundResponse 未找到响应
func NotFoundResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusNotFound, message)
}

// InternalServerErrorResponse 服务器错误响应
func InternalServerErrorResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusInternalServerError, message)
}

// ValidationErrorResponse 验证错误响应
func ValidationErrorResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusUnprocessableEntity, message)
}
