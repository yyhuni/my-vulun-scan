package handlers

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/internal/response"
	"vulun-scan-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// GetTools 获取工具列表
// @Summary 获取工具列表
// @Description 获取所有安全扫描工具列表，支持分页。固定按更新时间降序排列
// @Tags 工具管理
// @Produce json
// @Param page query int false "页码" default(1) example(1)
// @Param page_size query int false "每页数量" default(10) example(10)
// @Success 200 {object} models.APIResponse{data=models.GetToolsResponse} "获取成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /tools [get]
func GetTools(c *gin.Context) {
	service := services.NewToolService()

	// 绑定查询参数
	var req models.GetToolsRequest
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

	result, err := service.GetTools(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "获取工具列表失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, result)
}

// CreateTool 创建工具
// @Summary 创建工具
// @Description 创建新的安全扫描工具，支持多个分类标签，包含安装、更新和版本查询命令配置
// @Tags 工具管理
// @Accept json
// @Produce json
// @Param tool body models.CreateToolRequest true "工具信息" example({"name": "nuclei", "repo_url": "https://github.com/projectdiscovery/nuclei", "version": "v3.0.0", "description": "Fast and customisable vulnerability scanner", "category_names": ["vulnerability"], "install_command": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest", "update_command": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest", "version_command": "nuclei -version"})
// @Success 200 {object} models.APIResponse{data=models.ToolResponseData} "创建成功"
// @Failure 422 {object} models.APIResponse "请求参数验证失败"
// @Failure 500 {object} models.APIResponse "服务器内部错误"
// @Router /tools/create [post]
func CreateTool(c *gin.Context) {
	service := services.NewToolService()

	// 绑定请求体
	var req models.CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationErrorResponse(c, "请求参数错误: "+err.Error())
		return
	}

	tool, err := service.CreateTool(req)
	if err != nil {
		response.InternalServerErrorResponse(c, "创建工具失败: "+err.Error())
		return
	}

	response.SuccessResponse(c, models.ToolResponseData{Tool: tool})
}
