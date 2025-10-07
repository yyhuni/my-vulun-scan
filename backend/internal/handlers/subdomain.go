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
// @Router /subdomains [get]
func GetSubDomains(c *gin.Context) {
	service := services.NewSubDomainService()
	
	// 绑定查询参数（包含 id、domain_id、page 等）
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
	
	// 如果有 id 参数，查询单个子域名
	if req.ID > 0 {
		subDomain, err := service.GetSubDomainByID(req.ID)
		if err != nil {
			if errors.Is(err, customErrors.ErrSubDomainNotFound) {
				utils.NotFoundResponse(c, "子域名不存在")
				return
			}
			utils.InternalServerErrorResponse(c, fmt.Sprintf("获取子域名详情失败: %v", err))
			return
		}
		
		utils.SuccessResponse(c, subDomain)
		return
	}

	// 否则查询子域名列表

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
