package handlers

import (
	"errors"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GetOrgByID 获取单个组织详情
// @Summary 获取单个组织详情
// @Description 根据组织ID获取组织的详细信息
// @Tags 组织管理
// @Produce json
// @Param id path uint true "组织ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.Organization} "获取成功"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/{id} [get]
func GetOrgByID(c *gin.Context) {
	service := services.NewOrganizationService()

	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	organization, err := service.GetOrgByID(uri.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrOrganizationNotFound) {
			response.NotFoundResponse(c, "组织不存在")
			return
		}
		response.InternalServerErrorResponse(c, "获取组织详情失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, organization)
}

// GetOrgs 获取组织列表
// @Summary 获取组织列表
// @Description 获取所有组织列表，支持分页。固定按更新时间降序排列
// @Tags 组织管理
// @Produce json
// @Param page query int false "页码" default(1) example(1)
// @Param page_size query int false "每页数量" default(10) example(10)
// @Success 200 {object} models.APIResponse{data=models.GetOrgsResponse} "获取成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations [get]
func GetOrgs(c *gin.Context) {
	service := services.NewOrganizationService()

	// 绑定查询参数
	var req models.GetOrgsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	req.SetDefaults()

	result, err := service.GetOrgs(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取组织列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// CreateOrg 创建组织
// @Summary 创建组织
// @Description 创建新的组织
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.CreateOrgRequest true "组织信息"
// @Success 200 {object} models.APIResponse{data=models.Organization} "创建成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/create [post]
func CreateOrg(c *gin.Context) {
	var req models.CreateOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	organization, err := service.CreateOrg(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建组织失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, organization)
}

// UpdateOrg 更新组织
// @Summary 更新组织
// @Description 更新组织信息
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.UpdateOrgRequest true "更新信息"
// @Success 200 {object} models.APIResponse{data=models.Organization} "更新成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/update [post]
func UpdateOrg(c *gin.Context) {
	var req models.UpdateOrgRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	organization, err := service.UpdateOrg(req)
	if err != nil {
		if errors.Is(err, customErrors.ErrOrganizationNotFound) {
			response.NotFoundResponse(c, "组织不存在")
			return
		}
		response.InternalServerErrorResponse(c, "更新组织失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, organization)
}

// DeleteOrganization 删除组织
// @Summary 删除组织
// @Description 删除指定的组织（级联删除关联的域名和孤儿域名）
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.DeleteOrgRequest true "删除请求"
// @Success 200 {object} models.APIResponse{data=models.DeleteOrgResponseData} "删除成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/delete [post]
func DeleteOrganization(c *gin.Context) {
	var req models.DeleteOrgRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewOrganizationService()
	err := service.DeleteOrganization(req.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrOrganizationNotFound) {
			response.NotFoundResponse(c, "组织不存在")
			return
		}
		response.InternalServerErrorResponse(c, "删除组织失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, models.DeleteOrgResponseData{
		BaseDeleteResponse: models.BaseDeleteResponse{
			Message: "组织删除成功",
		},
	})
}

// BatchDeleteOrganizations 批量删除组织
// @Summary 批量删除组织
// @Description 批量删除组织（级联删除关联的域名和孤儿域名）
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.BatchDeleteOrgsRequest true "组织ID列表"
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteOrgsResponseData} "批量删除成功"
// @Failure 400 {object} models.APIResponse "业务逻辑错误"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/batch-delete [post]
func BatchDeleteOrganizations(c *gin.Context) {
	var req models.BatchDeleteOrgsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.OrgIDs) == 0 {
		response.BadRequestResponse(c, "组织ID列表不能为空")
		return
	}

	service := services.NewOrganizationService()
	deletedCount, err := service.BatchDeleteOrganizations(req.OrgIDs)
	if err != nil {
		if errors.Is(err, customErrors.ErrSomeOrganizationsNotExist) {
			response.BadRequestResponse(c, "部分组织ID不存在")
			return
		}
		response.InternalServerErrorResponse(c, "批量删除组织失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, models.BatchDeleteOrgsResponseData{
		BaseBatchDeleteResponseData: models.BaseBatchDeleteResponseData{
			Message:      "批量删除组织成功",
			DeletedCount: deletedCount,
		},
	})
}
