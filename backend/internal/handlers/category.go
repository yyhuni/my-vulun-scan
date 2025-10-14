package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GetCategories 获取所有工具分类
// @Summary 获取所有工具分类
// @Description 从工具表中获取所有已使用的分类名称（去重）
// @Tags 工具管理
// @Produce json
// @Success 200 {object} models.APIResponse{data=models.GetCategoriesResponse} "获取成功"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /categories [get]
func GetCategories(c *gin.Context) {
	// models 包用于 Swagger 文档生成
	_ = models.Tool{}
	
	service := services.NewCategoryService()

	result, err := service.GetCategories()
	if err != nil {
		response.InternalServerErrorResponse(c, "获取分类列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}
