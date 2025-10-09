package utils

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/asaskevich/govalidator"
)

// URLValidationError URL 验证错误类型
type URLValidationError struct {
	URL    string
	Reason string
}

func (e *URLValidationError) Error() string {
	return fmt.Sprintf("URL '%s' 验证失败: %s", e.URL, e.Reason)
}

// URLValidator URL 验证器
type URLValidator struct {
	// 是否只允许 HTTPS
	RequireHTTPS bool
	// 是否允许 IP 地址
	AllowIP bool
	// 最大长度限制
	MaxLength int
}

// NewURLValidator 创建默认的 URL 验证器
func NewURLValidator() *URLValidator {
	return &URLValidator{
		RequireHTTPS: false, // 允许 HTTP 和 HTTPS
		AllowIP:      true,  // 允许 IP 地址
		MaxLength:    2048,  // URL 最大长度
	}
}

// NewStrictURLValidator 创建严格的 URL 验证器（只允许 HTTPS）
func NewStrictURLValidator() *URLValidator {
	return &URLValidator{
		RequireHTTPS: true,
		AllowIP:      true,
		MaxLength:    2048,
	}
}

// ValidateURL 验证单个 URL
func (v *URLValidator) ValidateURL(urlStr string) error {
	// 1. 检查是否为空
	if urlStr == "" {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "URL 不能为空",
		}
	}

	// 2. 去除首尾空格
	urlStr = strings.TrimSpace(urlStr)

	// 3. 长度检查
	if len(urlStr) > v.MaxLength {
		return &URLValidationError{
			URL:    urlStr,
			Reason: fmt.Sprintf("URL 长度超过限制 (%d 字符)", v.MaxLength),
		}
	}

	// 4. 使用 govalidator 验证 URL 格式
	if !govalidator.IsURL(urlStr) {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "URL 格式无效",
		}
	}

	// 5. 解析 URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return &URLValidationError{
			URL:    urlStr,
			Reason: fmt.Sprintf("URL 解析失败: %v", err),
		}
	}

	// 6. 验证协议
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "只支持 HTTP 和 HTTPS 协议",
		}
	}

	// 7. 如果要求 HTTPS
	if v.RequireHTTPS && parsedURL.Scheme != "https" {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "必须使用 HTTPS 协议",
		}
	}

	// 8. 验证主机名
	if parsedURL.Host == "" {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "URL 必须包含有效的主机名",
		}
	}

	// 9. 检查是否为 IP 地址
	if !v.AllowIP {
		if govalidator.IsIP(parsedURL.Hostname()) {
			return &URLValidationError{
				URL:    urlStr,
				Reason: "不允许使用 IP 地址",
			}
		}
	}

	// 10. 检查路径安全性
	if strings.Contains(parsedURL.Path, "..") {
		return &URLValidationError{
			URL:    urlStr,
			Reason: "URL 路径不能包含 '..'",
		}
	}

	return nil
}

// ValidateURLs 批量验证 URL
func (v *URLValidator) ValidateURLs(urls []string) []error {
	var errors []error
	for _, urlStr := range urls {
		if err := v.ValidateURL(urlStr); err != nil {
			errors = append(errors, err)
		}
	}
	return errors
}

// ValidateHTTPURL 验证 HTTP/HTTPS URL（便捷函数）
func ValidateHTTPURL(urlStr string) error {
	validator := NewURLValidator()
	return validator.ValidateURL(urlStr)
}

// ValidateHTTPSURL 验证 HTTPS URL（便捷函数）
func ValidateHTTPSURL(urlStr string) error {
	validator := NewStrictURLValidator()
	return validator.ValidateURL(urlStr)
}

// ValidateHTTPURLs 批量验证 HTTP/HTTPS URL（便捷函数）
func ValidateHTTPURLs(urls []string) []error {
	validator := NewURLValidator()
	return validator.ValidateURLs(urls)
}

// NormalizeURL 规范化 URL（转换为小写，去除尾部斜杠等）
func NormalizeURL(urlStr string) (string, error) {
	validator := NewURLValidator()
	if err := validator.ValidateURL(urlStr); err != nil {
		return "", err
	}

	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return "", err
	}

	// 规范化处理
	parsedURL.Scheme = strings.ToLower(parsedURL.Scheme)
	parsedURL.Host = strings.ToLower(parsedURL.Host)

	return parsedURL.String(), nil
}
