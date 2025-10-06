package handlers

import (
	"errors"
	"fmt"
	"strconv"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetSubDomains 获取子域名信息
// @Summary 获取子域名信息(支持多种查询方式)
// @Description 支持按ID查询单个子域名、按域名ID筛选、分页查询和排序等
// @Tags 子域名管理
// @Produce json
// @Param id query uint false "子域名ID(查询单个子域名时使用)"
// @Param domain_id query uint false "域名ID(筛选指定域名下的子域名)"
// @Param page query int false "页码,默认1"
// @Param page_size query int false "每页数量,默认10"
// @Param sort_by query string false "排序字段: id, name, created_at, updated_at,默认updated_at"
// @Param sort_order query string false "排序方向: asc, desc,默认desc"
// @Success 200 {object} models.APIResponse{data=models.SubDomain} "获取单个子域名成功"
// @Success 200 {object} models.APIResponse{data=models.GetSubDomainsResponse} "获取子域名列表成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "子域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /subdomains [get]
func GetSubDomains(c *gin.Context) {
	service := services.NewSubDomainService()
	
	// 如果有 id 参数，查询单个子域名
	if idStr := c.Query("id"); idStr != "" {
		id, err := ParseUintFromString(idStr)
		if err != nil {
			utils.BadRequestResponse(c, "子域名ID格式错误")
			return
		}
		
		subDomain, err := service.GetSubDomainByID(id)
		if err != nil {
			if errors.Is(err, customErrors.ErrSubDomainNotFound) {
				utils.NotFoundResponse(c, "子域名不存在")
				return
			}
			utils.InternalServerErrorResponse(c, "获取子域名失败: "+err.Error())
			return
		}
		
		utils.SuccessResponse(c, subDomain)
		return
	}

	// 否则查询子域名列表
	// 初始化查询请求结构体
	var req models.GetSubDomainsRequest
	
	// 解析可选的域名ID参数，用于筛选特定域名下的子域名
	if domainIDStr := c.Query("domain_id"); domainIDStr != "" {
		if domainID, err := strconv.ParseUint(domainIDStr, 10, 32); err == nil {
			req.DomainID = uint(domainID)
		} else {
			utils.BadRequestResponse(c, "域名ID参数格式错误")
			return
		}
	}
	
	// 解析可选的组织ID参数，用于筛选特定组织下的子域名
	if organizationIDStr := c.Query("organization_id"); organizationIDStr != "" {
		if organizationID, err := strconv.ParseUint(organizationIDStr, 10, 32); err == nil {
			req.OrganizationID = uint(organizationID)
		} else {
			utils.BadRequestResponse(c, "组织ID参数格式错误")
			return
		}
	}
	
	// 解析分页参数，支持自定义页码和每页数量
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
	
	// 解析排序参数，支持多字段排序和升降序
	if sortBy := c.Query("sort_by"); sortBy != "" {
		req.SortBy = sortBy
	}
	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		req.SortOrder = sortOrder
	}

	// 调用服务层获取子域名列表
	response, err := service.GetSubDomains(req)
	if err != nil {
		utils.InternalServerErrorResponse(c, "获取子域名列表失败: "+err.Error())
		return
	}

	// 返回查询结果，包含分页信息和子域名数据
	utils.SuccessResponse(c, response)
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
