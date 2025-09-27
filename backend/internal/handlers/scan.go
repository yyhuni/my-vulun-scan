package handlers

import (
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// StartOrganizationScan 开始组织扫描
func StartOrganizationScan(c *gin.Context) {
	organizationID := c.Param("id")
	if organizationID == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	service := services.NewScanService()
	response, err := service.StartOrganizationScan(organizationID)
	if err != nil {
		if err.Error() == "organization has no main domains to scan" {
			utils.BadRequestResponse(c, "该组织没有主域名可以扫描")
			return
		}
		utils.InternalServerErrorResponse(c, "启动组织扫描失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}

// GetOrganizationScanHistory 获取组织扫描历史
func GetOrganizationScanHistory(c *gin.Context) {
	organizationID := c.Param("id")
	if organizationID == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	service := services.NewScanService()
	scanTasks, err := service.GetOrganizationScanHistory(organizationID)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织扫描历史失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, scanTasks)
}
