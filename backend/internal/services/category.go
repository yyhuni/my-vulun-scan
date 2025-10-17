package services

import (
	"sort"

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

// GetCategories 获取所有可用的工具分类（从 tools 表的 JSONB 数组中提取去重）
func (s *CategoryService) GetCategories() (*models.GetCategoriesResponse, error) {
	var tools []models.Tool

	// 查询所有工具的分类数组
	result := s.db.Model(&models.Tool{}).
		Select("category_names").
		Where("category_names IS NOT NULL").
		Find(&tools)

	if result.Error != nil {
		log.Error().Err(result.Error).Msg("Failed to query tools")
		return nil, result.Error
	}

	// 使用 map 去重收集所有分类
	categoryMap := make(map[string]bool)
	for _, tool := range tools {
		for _, category := range tool.CategoryNames {
			if category != "" {
				categoryMap[category] = true
			}
		}
	}

	// 转换为数组并排序
	categories := make([]string, 0, len(categoryMap))
	for category := range categoryMap {
		categories = append(categories, category)
	}

	// 使用标准库排序（O(n log n)）
	sort.Strings(categories)

	log.Info().
		Int("total", len(categories)).
		Strs("categories", categories).
		Msg("Categories retrieved successfully")

	return &models.GetCategoriesResponse{
		Categories: categories,
		Total:      len(categories),
	}, nil
}
