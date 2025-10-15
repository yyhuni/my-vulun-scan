package models

import (
	"time"
)

// Tool 安全扫描工具信息
type Tool struct {
	// 数据库基础字段
	ID        uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;index"`

	// 核心业务字段
	Name           string   `json:"name" gorm:"not null;index;size:255"`
	RepoURL        string   `json:"repo_url" gorm:"size:512"`
	Version        string   `json:"version" gorm:"size:100"`
	Description    string   `json:"description" gorm:"type:text"`
	CategoryNames  []string `json:"category_names" gorm:"type:jsonb;serializer:json"` // 工具分类标签数组
	InstallCommand string   `json:"install_command" gorm:"type:text;not null"`        // 安装命令
	UpdateCommand  string   `json:"update_command" gorm:"type:text;not null"`         // 更新命令
	VersionCommand string   `json:"version_command" gorm:"size:500;not null"`         // 版本查询命令
}

// GetToolsRequest 获取工具列表请求
type GetToolsRequest struct {
	BasePaginationRequest
	// 允许的排序字段：id, name, created_at, updated_at
}

// GetToolsResponse 获取工具列表响应
type GetToolsResponse struct {
	Tools []Tool `json:"tools"`
	BasePaginationResponse
}

// CreateToolRequest 创建工具请求
type CreateToolRequest struct {
	Name           string   `json:"name" binding:"required"`
	RepoURL        string   `json:"repo_url"`
	Version        string   `json:"version"`
	Description    string   `json:"description"`
	CategoryNames  []string `json:"category_names"`                     // 工具分类标签数组
	InstallCommand string   `json:"install_command" binding:"required"` // 安装命令（必填）
	UpdateCommand  string   `json:"update_command" binding:"required"`  // 更新命令（必填）
	VersionCommand string   `json:"version_command" binding:"required"` // 版本查询命令（必填）
}

// ToolResponseData 工具响应数据（用于创建、更新、获取单个工具）
type ToolResponseData struct {
	Tool *Tool `json:"tool"`
}

// GetCategoriesResponse 获取分类列表响应
type GetCategoriesResponse struct {
	Categories []string `json:"categories"` // 分类名称列表
	Total      int      `json:"total"`      // 分类数量
}
