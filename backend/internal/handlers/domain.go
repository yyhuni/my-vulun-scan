package handlers

import (
	"errors"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// CreateDomains 批量创建域名
// @Summary 批量创建域名
// @Description 批量创建域名并自动关联到指定组织（支持单个或多个域名）。如果域名已存在，会复用现有域名并建立关联关系
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateDomainsRequest true "域名创建请求，包含域名列表和组织ID"
// @Success 200 {object} models.APIResponse{data=[]models.Domain} "创建成功，返回创建的域名列表"
// @Failure 400 {object} models.APIResponse "请求参数错误（如域名列表为空、参数格式错误等）"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/create [post]
func CreateDomains(c *gin.Context) {
	var req models.CreateDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.Domains) == 0 {
		response.BadRequestResponse(c, "域名列表不能为空")
		return
	}

	// 验证域名格式
	var domainNames []string
	for _, detail := range req.Domains {
		domainNames = append(domainNames, detail.Name)
	}

	// 批量验证域名格式
	if validationErrors := utils.ValidateDomains(domainNames); len(validationErrors) > 0 {
		response.ValidationErrorResponse(c, "域名格式验证失败: "+validationErrors[0].Error())
		return
	}

	service := services.NewDomainService()
	domains, err := service.CreateDomains(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建域名失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, domains)
}

// GetDomainByID 获取单个域名详情
// @Summary 获取单个域名详情
// @Description 根据域名ID获取域名的详细信息（不包含子域名）
// @Tags 域名管理
// @Produce json
// @Param id path uint true "域名ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.Domain} "获取成功"
// @Failure 404 {object} models.APIResponse "域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/{id} [get]
func GetDomainByID(c *gin.Context) {
	service := services.NewDomainService()

	// 获取路径参数 id
	var uri struct {
		ID uint `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	domain, err := service.GetDomainByID(uri.ID)
	if err != nil {
		if errors.Is(err, customErrors.ErrDomainNotFound) {
			response.NotFoundResponse(c, "域名不存在")
			return
		}
		response.InternalServerErrorResponse(c, "获取域名失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, domain)
}

// UpdateDomain 更新域名
// @Summary 更新域名
// @Description 更新域名信息（名称和描述）
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.UpdateDomainRequest true "更新信息"
// @Success 200 {object} models.APIResponse{data=models.Domain} "更新成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/update [post]
func UpdateDomain(c *gin.Context) {
	var req models.UpdateDomainRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 验证新域名格式（如果提供了新名称）
	if req.Name != "" {
		if err := utils.ValidateDomain(req.Name); err != nil {
			response.ValidationErrorResponse(c, "域名格式验证失败: "+err.Error())
			return
		}
	}

	service := services.NewDomainService()
	domain, err := service.UpdateDomain(req)
	if err != nil {
		if errors.Is(err, customErrors.ErrDomainNotFound) {
			response.NotFoundResponse(c, "域名不存在")
			return
		}
		response.InternalServerErrorResponse(c, "更新域名失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, domain)
}

// GetDomainsByOrgID 获取组织的域名列表
// @Summary 获取组织的域名列表
// @Description 获取指定组织的所有域名，支持分页和排序。注意：返回的域名不包含子域名信息
// @Tags 域名管理
// @Produce json
// @Param id path uint true "组织ID" example(1)
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Param sort_by query string false "排序字段" default(updated_at) Enums(name, created_at, updated_at)
// @Param sort_order query string false "排序方向" default(desc) Enums(asc, desc)
// @Success 200 {object} models.APIResponse{data=models.GetOrgDomainsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/{id}/domains [get]
func GetDomainsByOrgID(c *gin.Context) {
	service := services.NewDomainService()

	// 绑定路径参数和查询参数
	var req models.GetDomainsByOrgIDRequest
	if err := c.ShouldBindUri(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}
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

	result, err := service.GetDomainsByOrgID(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// RemoveOrganizationDomain 解除组织与域名的关联
// @Summary 解除组织与域名的关联（待实现完善）
// @Description 解除指定组织与域名的关联关系，如果域名成为孤儿（没有任何组织关联）则自动删除该域名
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.RemoveOrgDomainRequest true "解除关联请求"
// @Success 200 {object} models.APIResponse{data=models.RemoveOrgDomainResponseData} "解除关联成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "组织、域名或关联不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/remove-from-organization [post]
func RemoveOrganizationDomain(c *gin.Context) {
	var req models.RemoveOrgDomainRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()
	err := service.RemoveOrganizationDomain(req)
	if err != nil {
		switch err.Error() {
		case "organization not found":
			response.NotFoundResponse(c, "组织不存在")
			return
		case "domain not found":
			response.NotFoundResponse(c, "域名不存在")
			return
		case "association not found":
			response.NotFoundResponse(c, "关联关系不存在")
			return
		default:
			response.InternalServerErrorResponse(c, "解除关联失败: "+err.Error())
			return
		}
	}

	response.SuccessResponse(c, models.RemoveOrgDomainResponseData{
		Message: "解除关联成功，孤儿域名已自动删除",
	})
}

// DeleteDomain 删除域名
// @Summary 删除域名
// @Description 根据ID删除域名，会级联删除所有关联的子域名、端点和漏洞数据
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param id path uint true "域名ID"
// @Success 200 {object} models.APIResponse{data=models.DeleteDomainResponseData} "删除成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "域名不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/{id} [delete]
func DeleteDomain(c *gin.Context) {
	var req models.DeleteDomainRequest

	// 绑定路径参数
	if err := c.ShouldBindUri(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	service := services.NewDomainService()

	// 执行删除操作
	if err := service.DeleteDomain(req.ID); err != nil {
		// 根据错误类型返回不同的响应
		if errors.Is(err, customErrors.ErrDomainNotFound) {
			response.NotFoundResponse(c, "域名不存在")
			return
		}
		response.InternalServerErrorResponse(c, "删除域名失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, models.DeleteDomainResponseData{
		Message: "域名删除成功，所有关联数据已清理",
	})
}
