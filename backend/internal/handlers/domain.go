package handlers

import (
	"strconv"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizationDomains 获取组织域名
// @Summary 获取组织的域名列表
// @Description 根据组织ID获取该组织下的所有域名
// @Tags 域名管理
// @Produce json
// @Param id path string true "组织ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/{id}/domains [get]
func GetOrganizationDomains(c *gin.Context) {
	organizationIDStr := c.Param("id")
	if organizationIDStr == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	organizationID, err := strconv.ParseUint(organizationIDStr, 10, 32)
	if err != nil {
		utils.BadRequestResponse(c, "无效的组织ID")
		return
	}

	service := services.NewDomainService()
	domains, err := service.GetOrganizationDomains(uint(organizationID))
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织域名失败: "+err.Error())
		return
	}

	response := models.GetOrganizationDomainsResponse{
		Domains: domains,
	}

	utils.SuccessResponse(c, response)
}

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
	response, err := service.CreateDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建域名失败: "+err.Error())
		return
	}

	// 使用统一的成功响应格式
	utils.SuccessResponse(c, response.Data)
}

// RemoveOrganizationDomain 移除组织域名关联
// @Summary 移除组织域名关联
// @Description 移除组织与域名之间的关联关系
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.RemoveOrganizationDomainRequest true "移除关联请求"
// @Success 200 {object} map[string]interface{} "移除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "未找到关联关系"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/remove-domain [post]
func RemoveOrganizationDomain(c *gin.Context) {
	var req models.RemoveOrganizationDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	err := service.RemoveOrganizationDomain(req)
	if err != nil {
		if err.Error() == "association not found" {
			utils.NotFoundResponse(c, "未找到关联关系")
			return
		}
		utils.InternalServerErrorResponse(c, "移除域名关联失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "域名关联移除成功"})
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
	idStr := c.Param("id")
	if idStr == "" {
		utils.BadRequestResponse(c, "域名ID不能为空")
		return
	}

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		utils.BadRequestResponse(c, "无效的域名ID")
		return
	}

	service := services.NewDomainService()
	domain, err := service.GetDomainByID(uint(id))
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

// UpdateDomain 更新域名信息
// @Summary 更新域名
// @Description 更新域名的名称或描述信息，支持部分字段更新
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.UpdateDomainRequest true "更新信息"
// @Success 200 {object} map[string]interface{} "更新成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "域名不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/update [post]
func UpdateDomain(c *gin.Context) {
	var req models.UpdateDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	domain, err := service.UpdateDomain(req)
	if err != nil {
		if err.Error() == "domain not found" {
			utils.NotFoundResponse(c, "域名不存在")
			return
		}
		if err.Error() == "domain name already exists" {
			utils.BadRequestResponse(c, "域名名称已存在")
			return
		}
		utils.InternalServerErrorResponse(c, "更新域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, domain)
}

// DeleteDomain 删除单个域名
// @Summary 删除域名
// @Description 删除指定域名及其所有关联数据
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.RemoveOrganizationDomainRequest true "删除请求"
// @Success 200 {object} map[string]interface{} "删除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "域名不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/delete [post]
func DeleteDomain(c *gin.Context) {
	var req models.RemoveOrganizationDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	err := service.DeleteDomain(req.DomainID)
	if err != nil {
		if err.Error() == "domain not found" {
			utils.NotFoundResponse(c, "域名不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "删除域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "域名删除成功"})
}

// BatchDeleteDomains 批量删除域名
// @Summary 批量删除域名
// @Description 批量删除多个域名及其关联数据
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.BatchDeleteDomainsRequest true "域名ID列表"
// @Success 200 {object} map[string]interface{} "批量删除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/batch-delete [post]
func BatchDeleteDomains(c *gin.Context) {
	var req models.BatchDeleteDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	response, err := service.BatchDeleteDomains(req.DomainIDs)
	if err != nil {
		utils.InternalServerErrorResponse(c, "批量删除域名失败: "+err.Error())
		return
	}

	c.JSON(200, response)
}

// SearchDomains 搜索域名
// @Summary 搜索域名
// @Description 支持关键词搜索和分页，返回匹配的域名列表
// @Tags 域名管理
// @Produce json
// @Param query query string false "搜索关键词"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} map[string]interface{} "搜索成功"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /domains/search [get]
func SearchDomains(c *gin.Context) {
	var req models.SearchDomainsRequest

	// 从查询参数获取搜索条件
	if query := c.Query("query"); query != "" {
		req.Query = query
	}
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			req.Page = page
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 {
			req.PageSize = pageSize
		}
	}

	service := services.NewDomainService()
	response, err := service.SearchDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "搜索域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}
