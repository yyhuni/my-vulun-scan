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
