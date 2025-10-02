package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// CreateSubDomains 创建子域名
// @Summary 批量创建子域名
// @Description 批量创建子域名并关联到指定域名
// @Tags 子域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateSubDomainsRequest true "子域名创建请求"
// @Success 200 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /sub-domains/create [post]
func CreateSubDomains(c *gin.Context) {
	var req models.CreateSubDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.SubDomains) == 0 {
		utils.BadRequestResponse(c, "子域名列表不能为空")
		return
	}

	service := services.NewSubDomainService()
	response, err := service.CreateSubDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建子域名失败: "+err.Error())
		return
	}

	c.JSON(200, response)
}
