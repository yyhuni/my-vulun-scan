package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizations 获取所有组织列表
func GetOrganizations(c *gin.Context) {
	service := services.NewOrganizationService()

	organizations, err := service.GetOrganizations()
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, organizations)
}

// CreateOrganization 创建新组织
func CreateOrganization(c *gin.Context) {
	var req models.CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	organization, err := service.CreateOrganization(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, organization)
}

// GetOrganizationByID 根据ID获取组织详情
func GetOrganizationByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	service := services.NewOrganizationService()
	organization, err := service.GetOrganizationByID(id)
	if err != nil {
		if err.Error() == "organization not found" {
			utils.NotFoundResponse(c, "组织不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "获取组织详情失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, organization)
}

// UpdateOrganization 更新组织信息
func UpdateOrganization(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.BadRequestResponse(c, "组织ID不能为空")
		return
	}

	var req models.UpdateOrganizationRequest
	req.ID = id

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	organization, err := service.UpdateOrganization(req)
	if err != nil {
		if err.Error() == "organization not found" {
			utils.NotFoundResponse(c, "组织不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "更新组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, organization)
}

// DeleteOrganization 删除组织
func DeleteOrganization(c *gin.Context) {
	var req models.DeleteOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	err := service.DeleteOrganization(req.OrganizationID)
	if err != nil {
		if err.Error() == "organization not found" {
			utils.NotFoundResponse(c, "组织不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "删除组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{"message": "组织删除成功"})
}

// BatchDeleteOrganizations 批量删除组织
func BatchDeleteOrganizations(c *gin.Context) {
	var req struct {
		OrganizationIDs []string `json:"organization_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.OrganizationIDs) == 0 {
		utils.BadRequestResponse(c, "组织ID列表不能为空")
		return
	}

	service := services.NewOrganizationService()
	var successCount int
	var failedIDs []string

	for _, id := range req.OrganizationIDs {
		err := service.DeleteOrganization(id)
		if err != nil {
			failedIDs = append(failedIDs, id)
		} else {
			successCount++
		}
	}

	response := gin.H{
		"success_count": successCount,
		"total_count":   len(req.OrganizationIDs),
		"failed_ids":    failedIDs,
	}

	if len(failedIDs) > 0 {
		response["message"] = "部分组织删除成功"
		utils.SuccessResponse(c, response)
	} else {
		response["message"] = "所有组织删除成功"
		utils.SuccessResponse(c, response)
	}
}

// SearchOrganizations 搜索组织
func SearchOrganizations(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		// 如果没有搜索查询，返回所有组织
		GetOrganizations(c)
		return
	}

	service := services.NewOrganizationService()
	organizations, err := service.GetOrganizations()
	if err != nil {
		utils.InternalServerErrorResponse(c, "搜索组织失败: "+err.Error())
		return
	}

	// 简单的字符串匹配搜索（实际项目中可以优化为数据库级别的搜索）
	var results []models.Organization
	for _, org := range organizations {
		if containsIgnoreCase(org.Name, query) || containsIgnoreCase(org.Description, query) {
			results = append(results, org)
		}
	}

	utils.SuccessResponse(c, results)
}

// containsIgnoreCase 忽略大小写的字符串包含检查
func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || containsIgnoreCaseHelper(s, substr))
}

func containsIgnoreCaseHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if equalIgnoreCase(s[i:i+len(substr)], substr) {
			return true
		}
	}
	return false
}

func equalIgnoreCase(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		if a[i]|32 != b[i]|32 { // 简单的ASCII大小写转换
			return false
		}
	}
	return true
}
