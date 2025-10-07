package handlers

import (
	"errors"
	"fmt"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

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

	response, err := services.NewSubDomainService().GetSubDomains(
		req.Page,
		req.PageSize,
		req.SortBy,
		req.SortOrder,
	)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取子域名列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
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
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	subDomain, err := service.GetSubDomainByID(uri.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrSubDomainNotFound) {
			utils.NotFoundResponse(c, "子域名不存在")
			return
		}
		utils.InternalServerErrorResponse(c, fmt.Sprintf("获取子域名详情失败: %v", err))
		return
	}

	utils.SuccessResponse(c, subDomain)
}

// CreateSubDomains 创建子域名
// @Summary 批量创建子域名
// @Description 批量创建子域名并关联到指定域名
// @Tags 子域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateSubDomainsRequest true "子域名创建请求"
// @Success 200 {object} models.APIResponse{data=models.CreateSubDomainsResponseData} "创建成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /subdomains/create [post]
func CreateSubDomains(c *gin.Context) {
	// 解析请求体
	var req models.CreateSubDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 验证子域名列表不能为空
	if len(req.SubDomains) == 0 {
		utils.BadRequestResponse(c, "子域名列表不能为空")
		return
	}

	// 调用服务层创建子域名
	service := services.NewSubDomainService()
	response, err := service.CreateSubDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "创建子域名失败: "+err.Error())
		return
	}

	// 构建响应消息，包含成功创建数量和已存在的域名信息
	message := fmt.Sprintf("成功创建 %d 个子域名", response.SuccessCount)
	if len(response.ExistingDomains) > 0 {
		message += fmt.Sprintf("，%d 个子域名已存在", len(response.ExistingDomains))
	}

	// 返回统一格式的成功响应，使用结构化的响应类型
	utils.SuccessResponse(c, models.CreateSubDomainsResponseData{
		Message:         message,
		SuccessCount:    response.SuccessCount,
		ExistingDomains: response.ExistingDomains,
		TotalRequested:  response.TotalRequested,
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
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
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
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
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
	response, err := service.GetSubDomainsByDomainID(
		uri.ID,
		queryParams.Page,
		queryParams.PageSize,
		queryParams.SortBy,
		queryParams.SortOrder,
	)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取域名子域名列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
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
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
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
		utils.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
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
	response, err := service.GetSubDomainsByOrgID(
		uri.ID,
		queryParams.Page,
		queryParams.PageSize,
		queryParams.SortBy,
		queryParams.SortOrder,
	)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取组织子域名列表失败: "+err.Error())
		return
	}

	utils.SuccessResponse(c, response)
}
