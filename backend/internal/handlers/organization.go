package handlers

import (
	"strconv"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetOrganizations 获取组织信息
// @Summary 获取组织信息(支持多种查询方式)
// @Description 支持按ID查询单个组织、获取组织列表、分页和排序等
// @Tags 组织管理
// @Produce json
// @Param id query uint false "组织ID(查询单个组织时使用)"
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: id, name, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} map[string]interface{} "成功返回数据"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 404 {object} map[string]interface{} "组织不存在"
// @Failure 500 {object} map[string]interface{} "服务器内部错误"
// @Router /organizations [get]
func GetOrganizations(c *gin.Context) {
	service := services.NewOrganizationService()

	// 如果有 id 参数，查询单个组织
	if idStr := c.Query("id"); idStr != "" {
		id, err := ParseUintFromString(idStr)
		if err != nil {
			utils.BadRequestResponse(c, "组织ID格式错误")
			return
		}

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
		return
	}

	// 否则查询组织列表
	// 解析分页和排序参数
	var req models.GetOrganizationsRequest
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
	// 解析排序参数
	if sortBy := c.Query("sort_by"); sortBy != "" {
		req.SortBy = sortBy
	}
	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		req.SortOrder = sortOrder
	}

	response, err := service.GetOrganizations(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
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

	utils.SuccessResponse(c, models.DeleteOrganizationResponseData{
		Message: "组织删除成功",
	})
}

// BatchDeleteOrganizations 批量删除组织
// @Summary 批量删除组织
// @Description 批量删除多个组织及其关联数据，如果组织下有孤儿域名，将一并删除
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

	utils.SuccessResponse(c, models.BatchDeleteOrganizationsResponseData{
		Message:        "批量删除组织成功",
		DeletedCount:   len(req.OrganizationIDs),
		Organizations:  organizations,
	})
}
