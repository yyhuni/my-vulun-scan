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

// GetDomains 获取域名信息
// @Summary 获取域名信息(支持多种查询方式)
// @Description 支持按ID查询单个域名、按组织ID查询域名列表、分页和排序等
// @Tags 域名管理
// @Produce json
// @Param id query uint false "域名ID(查询单个域名时使用)"
// @Param organization_id query uint false "组织ID(查询组织下域名列表时使用)"
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param sort_by query string false "排序字段" default(updated_at) Enums(name, created_at, updated_at)
// @Param sort_order query string false "排序方向" default(desc) Enums(asc, desc)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "域名不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains [get]
func GetDomains(c *gin.Context) {
	service := services.NewDomainService()
	
	// 如果有 id 参数，查询单个域名
	if idStr := c.Query("id"); idStr != "" {
		id, err := ParseUintFromString(idStr)
		if err != nil {
			utils.BadRequestResponse(c, "域名ID格式错误")
			return
		}
		
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
		return
	}
	
	// 否则查询域名列表
	var req models.GetOrganizationDomainsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	response, err := service.GetDomainsByOrgID(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取域名列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}

// RemoveOrganizationDomain 解除组织与域名的关联
// @Summary 解除组织与域名的关联
// @Description 解除指定组织与域名的关联关系，如果域名成为孤儿（没有任何组织关联）则自动删除该域名
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.RemoveOrganizationDomainRequest true "解除关联请求"
// @Success 200 {object} map[string]interface{} "解除关联成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "组织、域名或关联不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/remove-from-organization [post]
func RemoveOrganizationDomain(c *gin.Context) {
	var req models.RemoveOrganizationDomainRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	err := service.RemoveOrganizationDomain(req)
	if err != nil {
		switch err.Error() {
		case "organization not found":
			utils.NotFoundResponse(c, "组织不存在")
			return
		case "domain not found":
			utils.NotFoundResponse(c, "域名不存在")
			return
		case "association not found":
			utils.NotFoundResponse(c, "关联关系不存在")
			return
		default:
			utils.InternalServerErrorResponse(c, "解除关联失败: "+err.Error())
			return
		}
	}

	utils.SuccessResponse(c, gin.H{"message": "解除关联成功，孤儿域名已自动删除"})
}
