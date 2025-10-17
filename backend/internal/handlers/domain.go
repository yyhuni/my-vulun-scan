package handlers

import (
	"errors"
	"fmt"
	"strings"

	customErrors "vulun-scan-backend/internal/errors"
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"
	"vulun-scan-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// CreateDomains 批量创建域名
// @Summary 批量创建域名
// @Description 批量创建域名并自动关联到指定组织（支持单个或多个域名）
// @Description
// @Description **幂等性行为说明：**
// @Description - 如果域名已存在，会复用现有域名并建立新的关联关系
// @Description - 如果域名与组织的关联已存在，会跳过（不会报错）
// @Description - 每个新创建的域名会自动创建一个同名的根子域名
// @Description - 重复提交相同的域名是安全的，不会产生重复数据
// @Description
// @Description **业务场景：**
// @Description - 适用于从外部导入域名列表
// @Description - 支持多个组织共享同一个域名
// @Description - 域名在数据库中全局唯一，通过中间表实现多对多关系
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.CreateDomainsRequest true "域名创建请求，包含域名列表和组织ID"
// @Success 200 {object} models.APIResponse{data=models.CreateDomainsResponseData} "创建成功，返回统计信息"
// @Failure 400 {object} models.APIResponse "请求参数错误（如域名列表为空、参数格式错误等）"
// @Failure 404 {object} models.APIResponse "指定的组织不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/create [post]
func CreateDomains(c *gin.Context) {
	var req models.CreateDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.Domains) == 0 || req.OrgID == 0 {
		response.BadRequestResponse(c, "域名列表或组织ID不能为空")
		return
	}

	// 处理域名数据：过滤空值、规范化、验证
	// 优化：收集所有错误后一次性返回，提升用户体验
	validDomains := make([]models.DomainDetail, 0, len(req.Domains))
	var errorMessages []string

	for _, detail := range req.Domains {
		// 跳过空域名
		if detail.Name == "" {
			continue
		}

		// 1. 规范化域名（去除空格、统一小写、移除末尾的点）
		normalized, err := utils.NormalizeDomain(detail.Name)
		if err != nil {
			errorMessages = append(errorMessages, fmt.Sprintf("域名 [%s] 规范化失败: %s", detail.Name, err.Error()))
			continue
		}

		// 2. 验证规范化后的域名
		if err := utils.ValidateDomain(normalized); err != nil {
			errorMessages = append(errorMessages, fmt.Sprintf("域名 [%s] 格式无效: %s", detail.Name, err.Error()))
			continue
		}

		// 3. 添加到有效列表
		validDomains = append(validDomains, models.DomainDetail{
			Name:        normalized,
			Description: detail.Description,
		})
	}

	// 如果有验证错误，一次性返回所有错误信息
	if len(errorMessages) > 0 {
		response.ValidationErrorResponse(c, fmt.Sprintf("发现 %d 个无效域名:\n%s", len(errorMessages), strings.Join(errorMessages, "\n")))
		return
	}

	// 检查是否有有效域名
	if len(validDomains) == 0 {
		response.BadRequestResponse(c, "没有有效的域名数据（所有域名均为空）")
		return
	}

	// 更新为有效域名列表
	req.Domains = validDomains

	service := services.NewDomainService()
	result, err := service.CreateDomains(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建域名失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// GetDomainByID 获取单个域名详情
// @Summary 获取单个域名详情
// @Description 根据域名ID获取域名的详细信息（不包含组织关联信息）
// @Tags 域名管理
// @Produce json
// @Param id path uint true "域名ID" example(1)
// @Success 200 {object} models.APIResponse{data=models.GetDomainByIDResponseData} "获取成功"
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
// @Description 更新域名信息（名称和描述），返回更新后的域名信息（不包含组织关联信息）
// @Description
// @Description **字段更新说明：**
// @Description - name: 传null不更新，传空字符串会报错（域名不能为空），传值则更新
// @Description - description: 传null不更新，传空字符串清空，传值则更新
// @Description - 至少需要更新一个字段，否则直接返回原数据
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.UpdateDomainRequest true "更新信息"
// @Success 200 {object} models.APIResponse{data=models.DomainResponseData} "更新成功"
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

	// 处理新域名（如果提供了）：规范化 + 验证
	// 使用指针类型：nil表示不更新，非nil表示要更新（包括空字符串）
	if req.Name != nil {
		if *req.Name == "" {
			response.ValidationErrorResponse(c, "域名不能为空")
			return
		}

		// 1. 规范化域名
		normalized, err := utils.NormalizeDomain(*req.Name)
		if err != nil {
			response.ValidationErrorResponse(c, fmt.Sprintf("域名 [%s] 规范化失败: %s", *req.Name, err.Error()))
			return
		}

		// 2. 验证规范化后的域名
		if err := utils.ValidateDomain(normalized); err != nil {
			response.ValidationErrorResponse(c, fmt.Sprintf("域名 [%s] 格式无效: %s", *req.Name, err.Error()))
			return
		}

		// 3. 使用规范化后的域名
		req.Name = &normalized
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
// @Description 获取指定组织的所有域名，支持分页。固定按更新时间降序排列。注意：返回的域名不包含子域名信息
// @Tags 域名管理
// @Produce json
// @Param id path uint true "组织ID" example(1)
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
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
	req.SetDefaults()

	result, err := service.GetDomainsByOrgID(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// DeleteDomainFromOrganization 从组织中移除域名
// @Summary 从组织中移除域名
// @Description 解除指定组织与域名的关联关系，如果域名成为孤儿（没有任何组织关联）则自动删除该域名
// @Tags 域名管理
// @Produce json
// @Param organization_id path uint true "组织ID" example(1)
// @Param domain_id path uint true "域名ID" example(2)
// @Success 200 {object} models.APIResponse{data=models.DeleteDomainResponseData} "移除成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 404 {object} models.APIResponse "组织、域名或关联不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/{organization_id}/domains/{domain_id} [delete]
func DeleteDomainFromOrganization(c *gin.Context) {
	// 绑定路径参数
	var uri struct {
		OrganizationID uint `uri:"organization_id" binding:"required"`
		DomainID       uint `uri:"domain_id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 构建请求对象
	req := models.DeleteDomainRequest{
		OrgID:    uri.OrganizationID,
		DomainID: uri.DomainID,
	}

	service := services.NewDomainService()
	err := service.DeleteDomainFromOrganization(req)
	if err != nil {
		switch err.Error() {
		case "domain not found":
			response.NotFoundResponse(c, fmt.Sprintf("域名 ID: %d 不存在", uri.DomainID))
			return
		case "association not found":
			response.NotFoundResponse(c, fmt.Sprintf("组织 ID: %d 与域名 ID: %d 之间不存在关联关系", uri.OrganizationID, uri.DomainID))
			return
		default:
			response.InternalServerErrorResponse(c, fmt.Sprintf("从组织 ID: %d 移除域名 ID: %d 失败: %s", uri.OrganizationID, uri.DomainID, err.Error()))
			return
		}
	}

	response.SuccessResponse(c, models.DeleteDomainResponseData{
		BaseDeleteResponse: models.BaseDeleteResponse{
			Message: fmt.Sprintf("成功从组织 ID: %d 移除域名 ID: %d", uri.OrganizationID, uri.DomainID),
		},
	})
}

// BatchDeleteDomainsFromOrganization 批量从组织中移除域名
// @Summary 批量从组织中移除域名
// @Description 批量解除指定组织与多个域名的关联关系，如果域名成为孤儿（没有任何组织关联）则自动删除该域名。所有域名ID必须存在，否则返回错误
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param organization_id path uint true "组织ID" example(1)
// @Param request body models.BatchDeleteDomainsRequest true "批量移除请求，包含域名ID列表"
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteDomainsResponseData} "批量删除成功"
// @Failure 400 {object} models.APIResponse "请求参数错误或部分ID不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /organizations/{organization_id}/domains/batch-remove [post]
func BatchDeleteDomainsFromOrganization(c *gin.Context) {
	// 1. 绑定路径参数
	var uri struct {
		OrganizationID uint `uri:"organization_id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 2. 绑定请求体
	var req models.BatchDeleteDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.DomainIDs) == 0 {
		response.BadRequestResponse(c, "域名ID列表不能为空")
		return
	}

	service := services.NewDomainService()
	deletedCount, err := service.BatchDeleteDomainsFromOrganization(uri.OrganizationID, req.DomainIDs)
	if err != nil {
		response.InternalServerErrorResponse(c, fmt.Sprintf("批量移除失败: %s", err.Error()))
		return
	}

	response.SuccessResponse(c, models.BatchDeleteDomainsResponseData{
		BaseBatchDeleteResponseData: models.BaseBatchDeleteResponseData{
			Message:      fmt.Sprintf("批量移除成功，删除 %d 个域名关联", deletedCount),
			DeletedCount: deletedCount,
		},
	})
}

// BatchDeleteDomainsDirect 批量删除域名（不依赖组织）
// @Summary 批量删除域名（独立接口）
// @Description 直接批量删除指定的域名，不需要指定组织。
// @Description 此接口会：
// @Description 1. 删除所有 organization_domains 关联关系
// @Description 2. 批量删除域名本身（级联删除 SubDomain 和 Endpoint）
// @Description
// @Description **适用场景**：
// @Description - 前端批量删除操作（一次API调用完成）
// @Description - 不需要关心域名属于哪些组织
// @Description - 性能优化：避免多次API调用
// @Tags 域名管理
// @Accept json
// @Produce json
// @Param request body models.BatchDeleteDomainsDirectRequest true "批量删除请求"
// @Success 200 {object} models.APIResponse{data=models.BatchDeleteDomainsDirectResponseData} "批量删除成功"
// @Failure 400 {object} models.APIResponse "请求参数错误或部分ID不存在"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains/batch-delete [post]
func BatchDeleteDomainsDirect(c *gin.Context) {
	var req models.BatchDeleteDomainsDirectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	if len(req.DomainIDs) == 0 {
		response.BadRequestResponse(c, "域名ID列表不能为空")
		return
	}

	service := services.NewDomainService()
	deletedCount, err := service.BatchDeleteDomainsDirect(req.DomainIDs)
	if err != nil {
		response.InternalServerErrorResponse(c, fmt.Sprintf("批量删除失败: %s", err.Error()))
		return
	}

	response.SuccessResponse(c, models.BatchDeleteDomainsDirectResponseData{
		BaseBatchDeleteResponseData: models.BaseBatchDeleteResponseData{
			Message:      fmt.Sprintf("成功删除 %d 个域名", deletedCount),
			DeletedCount: deletedCount,
		},
	})
}

// GetDomains 获取所有域名列表
// @Summary 获取所有域名列表
// @Description 获取系统中的所有域名，支持分页。固定按更新时间降序排列
// @Tags 域名管理
// @Produce json
// @Param page query int false "页码" default(1)
// @Param page_size query int false "每页数量" default(10)
// @Success 200 {object} models.APIResponse{data=models.GetDomainsResponse} "获取成功"
// @Failure 400 {object} models.APIResponse "请求参数错误"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /domains [get]
func GetDomains(c *gin.Context) {
	var req models.GetDomainsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	// 设置默认值
	req.SetDefaults()

	service := services.NewDomainService()
	result, err := service.GetDomains(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取域名列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}
