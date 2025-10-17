package utils

import (
	"fmt"
	"strings"

	"github.com/asaskevich/govalidator"
)

// NormalizeDomain 规范化域名
// 处理内容：
// - 去除首尾空格
// - 统一转为小写
// - 移除末尾的点（FQDN 格式）
//
// 示例：
//
//	NormalizeDomain("  Example.COM.  ")
//	=> "example.com"
func NormalizeDomain(domain string) (string, error) {
	domain = strings.TrimSpace(domain)
	if domain == "" {
		return "", fmt.Errorf("域名不能为空")
	}
	domain = strings.ToLower(domain)
	domain = strings.TrimSuffix(domain, ".")
	return domain, nil
}

// ValidateDomain 验证域名格式
func ValidateDomain(domain string) error {
	const maxLength = 253 // RFC 1035 标准

	if domain == "" {
		return fmt.Errorf("域名不能为空")
	}

	if len(domain) > maxLength {
		return fmt.Errorf("域名长度超过限制 (%d 字符)", maxLength)
	}

	// 使用 govalidator 验证域名格式
	if !govalidator.IsDNSName(domain) {
		return fmt.Errorf("域名格式不符合 DNS 标准")
	}

	// 至少需要两个标签（如 example.com）
	labels := strings.Split(domain, ".")
	if len(labels) < 2 {
		return fmt.Errorf("域名至少需要包含两个部分（如 example.com）")
	}

	// 顶级域名检查（最后一个标签）
	tld := labels[len(labels)-1]
	if len(tld) < 2 {
		return fmt.Errorf("顶级域名至少需要 2 个字符")
	}
	if !govalidator.IsAlpha(tld) {
		return fmt.Errorf("顶级域名只能包含字母")
	}

	return nil
}

// ValidateSubdomain 验证子域名格式（至少 3 个部分）
func ValidateSubdomain(subdomain string) error {
	if subdomain == "" {
		return fmt.Errorf("子域名不能为空")
	}

	// 子域名必须至少包含 3 个部分（如 www.example.com）
	labels := strings.Split(subdomain, ".")
	if len(labels) < 3 {
		return fmt.Errorf("子域名必须至少包含 3 个部分（如 www.example.com）")
	}

	// 复用域名验证逻辑
	return ValidateDomain(subdomain)
}

// ValidateSubdomainBelongsTo 验证子域名是否属于指定的父域名
// 例如：
// - www.example.com 是 example.com 的子域名 ✓
// - api.example.com 是 example.com 的子域名 ✓
// - example.com 不是 example.com 的子域名（自己不是自己的子域名）✗
// - test.com 不是 example.com 的子域名 ✗
func ValidateSubdomainBelongsTo(subdomain, parentDomain string) error {

	if subdomain == "" || parentDomain == "" {
		return fmt.Errorf("子域名或父域名不能为空")
	}

	// 检查子域名是否属于父域名
	// 子域名必须以 ".父域名" 结尾，例如：www.example.com 以 .example.com 结尾
	suffix := "." + parentDomain
	if !strings.HasSuffix(subdomain, suffix) {
		return fmt.Errorf("'%s' 不是 '%s' 的子域名", subdomain, parentDomain)
	}

	return nil
}
