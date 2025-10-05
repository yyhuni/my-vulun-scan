package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// CreateDomains 创建域名
// @Summary 批量创建域名
// @Description 批量创建域名并关联到指定组织
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateDomainsRequest true "域名创建请求"
// @Success 200 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/create [post]
func CreateDomains(c *gin.Context) {
	var req models.CreateDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.Domains) == 0 {
		utils.BadRequestResponse(c, "域名列表不能为空")
		return
	}

	service := services.NewDomainService()
	domains, err := service.CreateDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建域名失败: "+err.Error())
		return
	}

	// 使用统一的成功响应格式
	utils.SuccessResponse(c, domains)
}

// GetDomainByID 根据ID获取域名详情
// @Summary 获取域名详情
// @Description 根据域名ID获取域名的详细信息，包括关联的子域名
// @Tags 域名管理
// @Produce json
// @Param id path string true "域名ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "域名不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/{id} [get]
func GetDomainByID(c *gin.Context) {
	id, err := ParseUintParam(c, "id")
	if err != nil {
		utils.BadRequestResponse(c, err.Error())
		return
	}

	service := services.NewDomainService()
	domain, err := service.GetDomainByID(id)
	if err != nil {
		if err.Error() == "domain not found" {
			utils.NotFoundResponse(c, "域名不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "获取域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, domain)
}

// GetDomainsByOrgID 根据组织ID获取域名列表
// @Summary 获取组织的域名列表(支持分页和排序)
// @Description 根据组织ID获取该组织下的所有域名，支持分页和排序
// @Tags 域名管理
// @Produce json
// @Param organization_id query uint true "组织ID"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param sort_by query string false "排序字段" default(updated_at) Enums(name, created_at, updated_at)
// @Param sort_order query string false "排序方向" default(desc) Enums(asc, desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/list [get]
func GetDomainsByOrgID(c *gin.Context) {
	var req models.GetOrganizationDomainsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	response, err := service.GetDomainsByOrgID(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取域名列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}
