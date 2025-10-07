package handlers

import (
	"errors"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizations 获取组织信息
// @Summary 获取组织信息
// @Description 支持两种查询模式：1) 通过id查询单个组织详情 2) 获取组织列表(支持分页和排序)
// @Tags 组织管理
// @Produce json
// @Param id query uint false "组织ID" example(1)
// @Param page query int false "页码" default(1) example(1)
// @Param page_size query int false "每页数量" default(10) example(10)
// @Param sort_by query string false "排序字段" default(updated_at) Enums(id, name, created_at, updated_at)
// @Param sort_order query string false "排序方向" default(desc) Enums(asc, desc)
// @Success 200 {object} models.APIResponse{data=models.Organization} "获取单个组织成功"
// @Success 200 {object} models.APIResponse{data=models.GetOrganizationsResponse} "获取组织列表成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations [get]
func GetOrganizations(c *gin.Context) {
	service := services.NewOrganizationService()

	// 绑定查询参数（包含 id、page、page_size 等）
	var req models.GetOrganizationsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}
	if req.SortBy == "" {
		req.SortBy = "updated_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	// 如果有 id 参数，查询单个组织的详情
	if req.ID > 0 {
		organization, err := service.GetOrganizationByID(req.ID)
		if err != nil {
			if errors.Is(err, customErrors.ErrOrganizationNotFound) {
				utils.NotFoundResponse(c, "组织不存在")
				return
			}
			utils.InternalServerErrorResponse(c, "获取组织详情失败: "+err.Error())
			return
		}

		utils.SuccessResponse(c, organization)
		return
	}

	// 否则查询组织列表，返回多个组织组成的列表
	response, err := service.GetOrganizations(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}

// CreateOrganization 创建组织
// @Summary 创建组织
// @Description 创建新的组织
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.CreateOrganizationRequest true "组织信息"
// @Success 200 {object} models.APIResponse{data=models.Organization} "创建成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
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

// UpdateOrganization 更新组织
// @Summary 更新组织
// @Description 更新组织信息
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.UpdateOrganizationRequest true "更新信息"
// @Success 200 {object} models.APIResponse{data=models.Organization} "更新成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
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
		if errors.Is(err, customErrors.ErrOrganizationNotFound) {
			utils.NotFoundResponse(c, "组织不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "更新组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, organization)
}

// TODO: 待实现完善
// DeleteOrganization 删除组织
// @Summary 删除组织（待实现完善）
// @Description 删除指定的组织（级联删除关联的域名和孤儿域名）
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.DeleteOrganizationRequest true "删除请求"
// @Success 200 {object} models.APIResponse{data=models.DeleteOrganizationResponseData} "删除成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
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
		if errors.Is(err, customErrors.ErrOrganizationNotFound) {
			utils.NotFoundResponse(c, "组织不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "删除组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, models.DeleteOrganizationResponseData{
		Message: "组织删除成功",
	})
}

// TODO: 待实现完善
// BatchDeleteOrganizations 批量删除组织
// @Summary 批量删除组织（待实现完善）
// @Description 批量删除组织（级联删除关联的域名和孤儿域名）
// @Tags 组织管理
// @Accept json
// @Produce json
// @Param request body models.BatchDeleteOrganizationsRequest true "组织ID列表"
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteOrganizationsResponseData} "批量删除成功"
// @Failure 400 {object} models.APIResponse "业务逻辑错误"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/batch-delete [post]
func BatchDeleteOrganizations(c *gin.Context) {
	var req models.BatchDeleteOrganizationsRequest
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
		if errors.Is(err, customErrors.ErrSomeOrganizationsNotExist) {
			utils.BadRequestResponse(c, "部分组织ID不存在")
			return
		}
		utils.InternalServerErrorResponse(c, "批量删除组织失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, models.BatchDeleteOrganizationsResponseData{
		Message:       "批量删除组织成功",
		DeletedCount:  len(req.OrganizationIDs),
		Organizations: organizations,
	})
}
