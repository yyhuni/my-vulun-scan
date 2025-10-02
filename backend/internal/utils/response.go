package utils

import (
	"net/http"

	"vulun-scan-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// SuccessResponse 成功响应
func SuccessResponse(c *gin.Context, data interface{}) {
	response := models.APIResponse{
		Code:    "200",
		State:   "success",
		Message: "操作成功",
		Data:    data,
	}
	c.JSON(http.StatusOK, response)
}

// ErrorResponse 错误响应
func ErrorResponse(c *gin.Context, statusCode int, message string) {
	response := models.APIResponse{
		Code:    "500", // 默认500
		State:   "error",
		Message: message,
	}
	c.JSON(statusCode, response)
}

// BadRequestResponse 请求错误响应 (400)
func BadRequestResponse(c *gin.Context, message string) {
	response := models.APIResponse{
		Code:    "400",
		State:   "error",
		Message: message,
	}
	c.JSON(http.StatusBadRequest, response)
}

// NotFoundResponse 未找到响应 (404)
func NotFoundResponse(c *gin.Context, message string) {
	response := models.APIResponse{
		Code:    "404",
		State:   "error",
		Message: message,
	}
	c.JSON(http.StatusNotFound, response)
}

// ValidationErrorResponse 验证错误响应 (422)
func ValidationErrorResponse(c *gin.Context, message string) {
	response := models.APIResponse{
		Code:    "422",
		State:   "error",
		Message: message,
	}
	c.JSON(http.StatusUnprocessableEntity, response)
}

// InternalServerErrorResponse 服务器错误响应 (500)
func InternalServerErrorResponse(c *gin.Context, message string) {
	response := models.APIResponse{
		Code:    "500",
		State:   "error",
		Message: message,
	}
	c.JSON(http.StatusInternalServerError, response)
}
