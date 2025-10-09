package handlers

import (
	"errors"
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// setEndpointDefaults 设置端点查询参数默认值
func setEndpointDefaults(page, pageSize *int, sortBy, sortOrder *string) {
	if *page <= 0 {
		*page = 1
	}
	if *pageSize <= 0 {
		*pageSize = 10
	}
	if *sortBy == "" {
		*sortBy = "updated_at"
	}
	if *sortOrder == "" {
		*sortOrder = "desc"
	}
}

// GetEndpoints 获取所有端点列表
// @Summary 获取所有端点列表
// @Description 获取所有端点，支持分页和排序
// @Tags 端点管理
// @Produce json
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: url, method, status_code, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.GetEndpointsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Router /endpoints [get]
func GetEndpoints(c *gin.Context) {
	var req models.GetEndpointsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	setEndpointDefaults(&req.Page, &req.PageSize, &req.SortBy, &req.SortOrder)

	// 调用 service 层获取数据
	endpointService := services.NewEndpointService()
	result, err := endpointService.GetEndpoints(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取端点列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// GetEndpointByID 按ID获取端点详情
// @Summary 获取端点详情
// @Description 根据端点ID获取端点详情
// @Tags 端点管理
// @Produce json
// @Param id path uint true "端点ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.Endpoint} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "端点不存在"
// @Router /endpoints/{id} [get]
func GetEndpointByID(c *gin.Context) {
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	ep, err := services.NewEndpointService().GetEndpointByID(uri.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrEndpointNotFound) {
			response.NotFoundResponse(c, "端点不存在")
			return
		}
		response.InternalServerErrorResponse(c, "获取端点失败: "+err.Error())
		return
	}
	response.SuccessResponse(c, ep)
}

// CreateEndpoints 批量创建端点
// @Summary 批量创建端点
// @Description 批量创建端点，支持单个或多个端点创建，必须关联到指定子域名。subdomain_id 为必填字段
// @Tags 端点管理
// @Accept json
// @Produce json
// @Param request body models.CreateEndpointsRequest true "端点创建请求"
// @Success 200 {object} models.APIResponse{data=models.CreateEndpointsResponseData} "创建成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Router /endpoints/create [post]
func CreateEndpoints(c *gin.Context) {
	var req models.CreateEndpointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 验证 subdomain_id 不能为空
	if req.SubdomainID == 0 {
		response.ValidationErrorResponse(c, "subdomain_id 不能为空")
		return
	}

	if len(req.Endpoints) == 0 {
		response.BadRequestResponse(c, "端点列表不能为空")
		return
	}

	// 验证端点数据 - 使用 URLValidator 进行严格验证
	for i, detail := range req.Endpoints {
		if detail.URL == "" {
			response.ValidationErrorResponse(c, fmt.Sprintf("第 %d 个端点的 URL 不能为空", i+1))
			return
		}

		// 使用 utils.ValidateHTTPURL 验证 URL 格式
		if err := utils.ValidateHTTPURL(detail.URL); err != nil {
			response.ValidationErrorResponse(c, fmt.Sprintf("第 %d 个端点的 URL 格式无效: %s", i+1, err.Error()))
			return
		}
	}

	result, err := services.NewEndpointService().CreateEndpoints(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建端点失败: "+err.Error())
		return
	}

	message := fmt.Sprintf("成功创建 %d 个端点", result.SuccessCount)
	if len(result.ExistingEndpoints) > 0 {
		message += fmt.Sprintf("，%d 个端点已存在", len(result.ExistingEndpoints))
	}

	response.SuccessResponse(c, models.CreateEndpointsResponseData{
		Message:           message,
		SuccessCount:      result.SuccessCount,
		ExistingEndpoints: result.ExistingEndpoints,
		TotalRequested:    result.TotalRequested,
	})
}

// GetEndpointsBySubdomainID 获取子域名下的端点
// @Summary 获取子域名的端点列表
// @Description 根据子域名ID获取该子域名下的端点，支持分页和排序
// @Tags 子域名管理
// @Produce json
// @Param id path uint true "子域名ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: url, method, status_code, created_at, updated_at,默认updated_at"
// @Tags 子域名管理
// @Produce json
// @Param id path uint true "子域名ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: url, method, status_code, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.GetEndpointsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Router /subdomains/{id}/endpoints [get]
func GetEndpointsBySubdomainID(c *gin.Context) {
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	var query struct {
		Page      int    `form:"page"`
		PageSize  int    `form:"page_size"`
		SortBy    string `form:"sort_by"`
		SortOrder string `form:"sort_order"`
	}
	if err := c.ShouldBindQuery(&query); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	setEndpointDefaults(&query.Page, &query.PageSize, &query.SortBy, &query.SortOrder)

	result, err := services.NewEndpointService().GetEndpointsBySubdomainID(
		uri.ID, query.Page, query.PageSize, query.SortBy, query.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取子域名端点列表失败: "+err.Error())
		return
	}
	response.SuccessResponse(c, result)
}
