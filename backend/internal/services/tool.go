package services

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// ToolService 工具服务
type ToolService struct {
	db *gorm.DB
}

// NewToolService 创建工具服务实例
func NewToolService() *ToolService {
	return &ToolService{
		db: database.GetDB(),
	}
}

// GetTools 获取工具列表(支持分页和排序)
func (s *ToolService) GetTools(req models.GetToolsRequest) (*models.GetToolsResponse, error) {
	var tools []models.Tool
	var total int64

	// 查询总数
	if err := s.db.Model(&models.Tool{}).Count(&total).Error; err != nil {
		log.Error().Err(err).Msg("Failed to count tools")
		return nil, err
	}

	// 计算总页数
	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	// 构建排序子句（统一：按更新时间倒序）
	orderClause := "updated_at desc"

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	result := s.db.Order(orderClause).Offset(offset).Limit(req.PageSize).Find(&tools)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query tools")
		return nil, result.Error
	}

	log.Info().
		Int("page", req.Page).
		Int("page_size", req.PageSize).
		Int64("total", total).
		Int("count", len(tools)).
		Msg("Tools retrieved successfully")

	return &models.GetToolsResponse{
		Tools: tools,
		BasePaginationResponse: models.BasePaginationResponse{
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	}, nil
}

// CreateTool 创建工具
func (s *ToolService) CreateTool(req models.CreateToolRequest) (*models.Tool, error) {

	tool := models.Tool{
		Name:           req.Name,
		RepoURL:        req.RepoURL,
		Version:        req.Version,
		Description:    req.Description,
		CategoryNames:  req.CategoryNames,
		InstallCommand: req.InstallCommand,
		UpdateCommand:  req.UpdateCommand,
		VersionCommand: req.VersionCommand,
	}

	result := s.db.Create(&tool)
	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to create tool")
		return nil, result.Error
	}

	log.Info().
		Uint("id", tool.ID).
		Str("name", tool.Name).
		Msg("Tool created successfully")

	return &tool, nil
}
