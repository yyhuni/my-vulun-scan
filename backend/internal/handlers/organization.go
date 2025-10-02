package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizations 获取所有组织列表
// @Summary 获取组织列表
// @Description 返回所有组织列表
// @Tags 组织管理
// @Produce json
// @Success 200 {object} map[string]interface{} "成功返回列表数据"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations [get]
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
// @Summary 创建组织
// @Description 根据请求体创建一个新组织
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.CreateOrganizationRequest true "组织信息"
// @Success 200 {object} map[string]interface{} "创建成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/create [post]
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
// @Summary 获取组织详情
// @Description 根据组织ID获取组织的详细信息
// @Tags 组织管理
// @Produce json
// @Param id path string true "组织ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "组织不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/{id} [get]
func GetOrganizationByID(c *gin.Context) {
	id, err := ParseUintParam(c, "id")
	if err != nil {
		utils.BadRequestResponse(c, err.Error())
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
// @Summary 更新组织
// @Description 更新指定组织的名称和描述信息
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.UpdateOrganizationRequest true "更新信息"
// @Success 200 {object} map[string]interface{} "更新成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "组织不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/update [post]
func UpdateOrganization(c *gin.Context) {
	var req models.UpdateOrganizationRequest

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
// @Summary 删除组织
// @Description 删除指定组织及其关联数据
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.DeleteOrganizationRequest true "删除请求"
// @Success 200 {object} map[string]interface{} "删除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "组织不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/delete [post]
func DeleteOrganization(c *gin.Context) {
	var req models.DeleteOrganizationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	err := service.DeleteOrganization(req.ID)
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
// @Summary 批量删除组织
// @Description 批量删除多个组织及其关联数据
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body object{organization_ids=[]uint} true "组织ID列表"
// @Success 200 {object} map[string]interface{} "批量删除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations/batch-delete [post]
func BatchDeleteOrganizations(c *gin.Context) {
	var req struct {
		OrganizationIDs []uint `json:"organization_ids" binding:"required"`
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
	organizations, err := service.BatchDeleteOrganizations(req.OrganizationIDs)
	if err != nil {
		if err.Error() == "some organization IDs do not exist" {
			utils.BadRequestResponse(c, "部分组织ID不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "删除组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, gin.H{
		"message":       "批量删除组织成功",
		"deleted_count": len(req.OrganizationIDs),
		"organizations": organizations,
	})
}
