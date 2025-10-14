package services

import (
	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

// CategoryService 分类服务
type CategoryService struct {
	db *gorm.DB
}

// NewCategoryService 创建分类服务实例
func NewCategoryService() *CategoryService {
	return &CategoryService{
		db: database.GetDB(),
	}
}

// GetCategories 获取所有可用的工具分类（从 tools 表去重获取）
func (s *CategoryService) GetCategories() (*models.GetCategoriesResponse, error) {
	var categories []string

	// 从 tools 表中查询所有不重复的 category_name，过滤掉空值
	result := s.db.Model(&models.Tool{}).
		Distinct("category_name").
		Where("category_name != ?", "").
		Order("category_name ASC").
		Pluck("category_name", &categories)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query categories")
		return nil, result.Error
	}

	log.Info().
		Int("total", len(categories)).
		Strs("categories", categories).
		Msg("Categories retrieved successfully")

	return &models.GetCategoriesResponse{
		Categories: categories,
		Total:      len(categories),
	}, nil
}
