package handlers

import (
	"strconv"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizationSubDomains 获取组织子域名
// @Summary 获取组织的子域名列表
// @Description 根据组织ID获取该组织下的所有子域名，支持分页
// @Tags 子域名管理
// @Produce json
// @Param id path string true "组织ID"
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量" default(10)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/{id}/sub-domains [get]
func GetOrganizationSubDomains(c *gin.Context) {
	organizationID := c.Param("id")
	if organizationID == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	// 获取分页参数
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	service := services.NewSubDomainService()
	response, err := service.GetOrganizationSubDomains(organizationID, page, pageSize)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织子域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}

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
