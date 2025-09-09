package handlers

import (
	"strconv"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizationMainDomains 获取组织主域名
func GetOrganizationMainDomains(c *gin.Context) {
	organizationID := c.Param("id")
	if organizationID == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	service := services.NewDomainService()
	mainDomains, err := service.GetOrganizationMainDomains(organizationID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织主域名失败: "+err.Error())
		return
	}

	response := models.GetOrganizationMainDomainsResponse{
		MainDomains: mainDomains,
	}

	utils.SuccessResponse(c, response)
}

// CreateMainDomains 创建主域名
func CreateMainDomains(c *gin.Context) {
	var req models.CreateMainDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.MainDomains) == 0 {
		utils.BadRequestResponse(c, "主域名列表不能为空")
		return
	}

	service := services.NewDomainService()
	response, err := service.CreateMainDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建主域名失败: "+err.Error())
		return
	}

	c.JSON(200, response)
}

// RemoveOrganizationMainDomain 移除组织主域名关联
func RemoveOrganizationMainDomain(c *gin.Context) {
	var req models.RemoveOrganizationMainDomainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	err := service.RemoveOrganizationMainDomain(req)
	if err != nil {
		if err.Error() == "association not found" {
			utils.NotFoundResponse(c, "未找到关联关系")
			return
		}
		utils.InternalServerErrorResponse(c, "移除主域名关联失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "主域名关联移除成功"})
}

// GetOrganizationSubDomains 获取组织子域名
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

	service := services.NewDomainService()
	response, err := service.GetOrganizationSubDomains(organizationID, page, pageSize)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织子域名失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}

// CreateSubDomains 创建子域名
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

	service := services.NewDomainService()
	response, err := service.CreateSubDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建子域名失败: "+err.Error())
		return
	}

	c.JSON(200, response)
}
