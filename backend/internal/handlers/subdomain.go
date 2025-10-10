package handlers

import (
	"errors"
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GetSubDomains 获取所有子域名列表
// @Summary 获取所有子域名列表
// @Description 获取所有子域名，支持分页和排序
// @Tags 子域名管理
// @Produce json
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: id, name, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.GetSubDomainsResponse} "获取子域名列表成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /subdomains [get]
func GetSubDomains(c *gin.Context) {
	var req models.GetSubDomainsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
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

	result, err := services.NewSubDomainService().GetSubDomains(
		req.Page,
		req.PageSize,
		req.SortBy,
		req.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取子域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// GetSubDomainByID 获取单个子域名详情
// @Summary 获取单个子域名详情
// @Description 根据子域名ID获取子域名的详细信息
// @Tags 子域名管理
// @Produce json
// @Param id path uint true "子域名ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.SubDomain} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "子域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /subdomains/{id} [get]
func GetSubDomainByID(c *gin.Context) {
	service := services.NewSubDomainService()

	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	subDomain, err := service.GetSubDomainByID(uri.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrSubDomainNotFound) {
			response.NotFoundResponse(c, "子域名不存在")
			return
		}
		response.InternalServerErrorResponse(c, fmt.Sprintf("获取子域名详情失败: %v", err))
		return
	}

	response.SuccessResponse(c, subDomain)
}

// CreateSubDomains 创建子域名
// @Summary 批量创建子域名（支持根域名分组）
// @Description 前端发送分组后的域名数据，后端自动创建根域名和子域名，需要指定组织ID
// @Tags 子域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateSubDomainsRequest true "子域名创建请求（包含组织ID）"
// @Success 200 {object} models.APIResponse{data=models.CreateSubDomainsResponseData} "创建成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /subdomains/create [post]
func CreateSubDomains(c *gin.Context) {
	// 解析请求体
	var req models.CreateSubDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 验证域名分组列表不能为空
	if len(req.DomainGroups) == 0 {
		response.BadRequestResponse(c, "域名分组列表不能为空")
		return
	}

	// 调用服务层创建子域名
	service := services.NewSubDomainService()
	result, err := service.CreateSubDomains(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建子域名失败: "+err.Error())
		return
	}

	// 计算已存在的子域名数量
	alreadyExists := result.TotalUniqueSubdomains - result.SubdomainsCreated

	// 返回结构化数据，由前端构建友好的消息
	response.SuccessResponse(c, models.CreateSubDomainsResponseData{
		SubdomainsCreated:     result.SubdomainsCreated,
		AlreadyExists:         alreadyExists,
		SkippedDomains:        result.SkippedDomains,
		TotalUniqueSubdomains: result.TotalUniqueSubdomains,
	})
}

// GetSubDomainsByDomainID 获取域名的所有子域名
// @Summary 获取域名的子域名列表
// @Description 根据域名ID获取该域名下的所有子域名（支持分页和排序）
// @Tags 域名管理
// @Produce json
// @Param id path uint true "域名ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: id, name, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.GetSubDomainsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/{id}/subdomains [get]
func GetSubDomainsByDomainID(c *gin.Context) {
	service := services.NewSubDomainService()

	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 绑定查询参数（分页、排序）
	var queryParams struct {
		Page      int    `form:"page"`
		PageSize  int    `form:"page_size"`
		SortBy    string `form:"sort_by"`
		SortOrder string `form:"sort_order"`
	}
	if err := c.ShouldBindQuery(&queryParams); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	if queryParams.Page <= 0 {
		queryParams.Page = 1
	}
	if queryParams.PageSize <= 0 {
		queryParams.PageSize = 10
	}
	if queryParams.SortBy == "" {
		queryParams.SortBy = "updated_at"
	}
	if queryParams.SortOrder == "" {
		queryParams.SortOrder = "desc"
	}

	// 调用服务层获取子域名列表
	result, err := service.GetSubDomainsByDomainID(
		uri.ID,
		queryParams.Page,
		queryParams.PageSize,
		queryParams.SortBy,
		queryParams.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取域名子域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// GetSubDomainsByOrgID 获取组织的所有子域名
// @Summary 获取组织的子域名列表
// @Description 根据组织ID获取该组织所有域名下的子域名（支持分页和排序）
// @Tags 组织管理
// @Produce json
// @Param id path uint true "组织ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: id, name, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.GetSubDomainsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/{id}/subdomains [get]
func GetSubDomainsByOrgID(c *gin.Context) {
	service := services.NewSubDomainService()

	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 绑定查询参数（分页、排序）
	var queryParams struct {
		Page      int    `form:"page"`
		PageSize  int    `form:"page_size"`
		SortBy    string `form:"sort_by"`
		SortOrder string `form:"sort_order"`
	}
	if err := c.ShouldBindQuery(&queryParams); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	if queryParams.Page <= 0 {
		queryParams.Page = 1
	}
	if queryParams.PageSize <= 0 {
		queryParams.PageSize = 10
	}
	if queryParams.SortBy == "" {
		queryParams.SortBy = "updated_at"
	}
	if queryParams.SortOrder == "" {
		queryParams.SortOrder = "desc"
	}

	// 调用服务层获取子域名列表
	result, err := service.GetSubDomainsByOrgID(
		uri.ID,
		queryParams.Page,
		queryParams.PageSize,
		queryParams.SortBy,
		queryParams.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取组织子域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}
