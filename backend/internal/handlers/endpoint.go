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

// GetEndpoints 获取所有端点列表
// @Summary 获取所有端点列表
// @Description 获取所有端点，支持分页。固定按更新时间降序排列。如需按域名或子域名过滤，请使用 /domains/:id/endpoints 或 /subdomains/:id/endpoints
// @Tags 端点管理
// @Produce json
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
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
	req.SetDefaults()

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
// @Summary 批量创建端点（自动提取域名，缺失则跳过）
// @Description 批量创建端点，支持单个或多个端点创建。会自动从 URL 中提取 host 和根域名进行匹配，仅对已存在的 domain 和 subdomain 创建端点；若不存在将被跳过。无需手动指定任何 ID
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
	skipped := result.TotalRequested - result.SuccessCount - len(result.ExistingEndpoints)
	if skipped > 0 {
		message += fmt.Sprintf("，%d 个端点因域名/子域名不存在被跳过", skipped)
	}

	response.SuccessResponse(c, models.CreateEndpointsResponseData{
		Message:           message,
		SuccessCount:      result.SuccessCount,
		ExistingEndpoints: result.ExistingEndpoints,
		TotalRequested:    result.TotalRequested,
	})
}

// GetEndpointsByDomainID 获取指定域名下的端点列表
// @Summary 获取指定域名下的端点列表
// @Description 根据域名ID获取该域名下的所有端点（包括所有子域名的端点）。固定按更新时间降序排列
// @Tags 域名管理
// @Produce json
// @Param id path uint true "域名ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Success 200 {object} models.APIResponse{data=models.GetEndpointsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Router /domains/{id}/endpoints [get]
func GetEndpointsByDomainID(c *gin.Context) {
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	var query models.BasePaginationRequest
	if err := c.ShouldBindQuery(&query); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	query.SetDefaults()

	result, err := services.NewEndpointService().GetEndpointsByDomainID(
		uri.ID, query.Page, query.PageSize, query.SortBy, query.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取域名端点列表失败: "+err.Error())
		return
	}
	response.SuccessResponse(c, result)
}

// GetEndpointsBySubdomainID 获取子域名下的端点
// @Summary 获取子域名的端点列表
// @Description 根据子域名ID获取该子域名下的端点，支持分页。固定按更新时间降序排列
// @Tags 子域名管理
// @Produce json
// @Param id path uint true "子域名ID" example(1)
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
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

	var query models.BasePaginationRequest
	if err := c.ShouldBindQuery(&query); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	query.SetDefaults()

	result, err := services.NewEndpointService().GetEndpointsBySubdomainID(
		uri.ID, query.Page, query.PageSize, query.SortBy, query.SortOrder,
	)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取子域名端点列表失败: "+err.Error())
		return
	}
	response.SuccessResponse(c, result)
}

// DeleteEndpoint 删除单个端点
// @Summary 删除单个端点
// @Description 删除指定ID的端点（级联删除关联的Vulnerabilities）
// @Tags 端点管理
// @Produce json
// @Param id path uint true "端点ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteEndpointsResponseData} "删除成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "端点不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /endpoints/{id} [delete]
func DeleteEndpoint(c *gin.Context) {
	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 复用批量删除逻辑，传入单个ID的数组
	service := services.NewEndpointService()
	deletedCount, err := service.BatchDeleteEndpoints([]uint{uri.ID})
	if err != nil {
		response.InternalServerErrorResponse(c, "删除端点失败: "+err.Error())
		return
	}

	// 返回删除成功信息（统一使用结构化响应类型）
	response.SuccessResponse(c, models.BatchDeleteEndpointsResponseData{
		Message:      "删除端点成功",
		DeletedCount: deletedCount,
	})
}

// BatchDeleteEndpoints 批量删除端点
// @Summary 批量删除端点
// @Description 批量删除端点（级联删除关联的Vulnerabilities）
// @Tags 端点管理
// @Accept json
// @Produce json
// @Param request body models.BatchDeleteEndpointsRequest true "端点ID列表"
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteEndpointsResponseData} "批量删除成功"
// @Failure 400 {object} models.APIResponse "业务逻辑错误"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /endpoints/batch-delete [post]
func BatchDeleteEndpoints(c *gin.Context) {
	var req models.BatchDeleteEndpointsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.EndpointIDs) == 0 {
		response.BadRequestResponse(c, "端点ID列表不能为空")
		return
	}

	service := services.NewEndpointService()
	deletedCount, err := service.BatchDeleteEndpoints(req.EndpointIDs)
	if err != nil {
		// 使用 errors.Is 判断业务错误类型
		if errors.Is(err, customErrors.ErrEmptyEndpointIDs) || 
		   errors.Is(err, customErrors.ErrPartialEndpointsNotFound) {
			response.BadRequestResponse(c, err.Error())
			return
		}
		// 其他错误返回 500（服务器内部错误）
		response.InternalServerErrorResponse(c, "批量删除端点失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, models.BatchDeleteEndpointsResponseData{
		Message:      "批量删除端点成功",
		DeletedCount: deletedCount,
	})
}
