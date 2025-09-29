package handlers

import (
	"strconv"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizationDomains 获取组织域名
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

	c.JSON(200, response)
}

// RemoveOrganizationDomain 移除组织域名关联
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
// 处理GET /domains/:id请求
// 参数：域名ID（从URL路径参数获取）
// 返回：域名详细信息，包括关联的子域名等
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
// 处理POST /domains/update请求
// 参数：UpdateDomainRequest结构体，支持部分字段更新
// 返回：更新后的域名完整信息
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
// 处理POST /domains/delete请求
// 参数：RemoveOrganizationDomainRequest结构体（复用，实际上只需要domain_id）
// 返回：操作成功消息
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
// 处理POST /domains/batch-delete请求
// 参数：BatchDeleteDomainsRequest结构体，包含要删除的域名ID列表
// 返回：APIResponse结构体，包含操作统计信息
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
// 处理GET /domains/search请求
// 参数：通过查询参数获取，支持query（搜索关键词）、page（页码）、page_size（每页数量）
// 返回：SearchDomainsResponse结构体，包含分页结果和统计信息
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
