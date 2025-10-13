package utils

import (
	"fmt"
	"net"
	"strings"

	"github.com/asaskevich/govalidator"
)

// DomainValidationError 域名验证错误类型
type DomainValidationError struct {
	Domain string
	Reason string
}

func (e *DomainValidationError) Error() string {
	return fmt.Sprintf("域名 '%s' 验证失败: %s", e.Domain, e.Reason)
}

// DomainValidator 域名验证器
type DomainValidator struct {
	// 是否允许子域名
	AllowSubdomains bool
	// 是否允许国际化域名 (IDN)
	AllowIDN bool
	// 最大长度限制
	MaxLength int
	// 是否进行 DNS 解析验证
	CheckDNS bool
}

// NewDomainValidator 创建默认的域名验证器
func NewDomainValidator() *DomainValidator {
	return &DomainValidator{
		AllowSubdomains: true,
		AllowIDN:        false, // 暂不支持国际化域名
		MaxLength:       253,   // RFC 1035 标准
		CheckDNS:        false, // 默认不进行 DNS 验证，避免网络依赖
	}
}

// NewStrictDomainValidator 创建严格的域名验证器（用于生产环境）
func NewStrictDomainValidator() *DomainValidator {
	return &DomainValidator{
		AllowSubdomains: true,
		AllowIDN:        false,
		MaxLength:       253,
		CheckDNS:        true, // 生产环境可以开启 DNS 验证
	}
}

// ValidateDomain 验证单个域名
func (v *DomainValidator) ValidateDomain(domain string) error {
	if domain == "" {
		return &DomainValidationError{
			Domain: domain,
			Reason: "域名不能为空",
		}
	}

	// 去除首尾空格
	domain = strings.TrimSpace(domain)

	// 长度检查（使用 govalidator）
	if !govalidator.StringLength(domain, "0", fmt.Sprintf("%d", v.MaxLength)) {
		return &DomainValidationError{
			Domain: domain,
			Reason: fmt.Sprintf("域名长度超过限制 (%d 字符)", v.MaxLength),
		}
	}

	// 基本格式检查
	if err := v.validateBasicFormat(domain); err != nil {
		return err
	}

	// 标签检查（域名的各个部分）
	if err := v.validateLabels(domain); err != nil {
		return err
	}

	// 子域名检查
	if !v.AllowSubdomains && v.isSubdomain(domain) {
		return &DomainValidationError{
			Domain: domain,
			Reason: "不允许子域名",
		}
	}

	// DNS 解析检查（可选）
	if v.CheckDNS {
		if err := v.validateDNS(domain); err != nil {
			return err
		}
	}

	return nil
}

// ValidateDomains 批量验证域名
func (v *DomainValidator) ValidateDomains(domains []string) []error {
	var errors []error
	for _, domain := range domains {
		if err := v.ValidateDomain(domain); err != nil {
			errors = append(errors, err)
		}
	}
	return errors
}

// validateBasicFormat 基本格式验证 - 使用 govalidator
func (v *DomainValidator) validateBasicFormat(domain string) error {
	// 使用 govalidator 验证域名格式（覆盖大部分基础规则）
	if !govalidator.IsDNSName(domain) {
		return &DomainValidationError{
			Domain: domain,
			Reason: "域名格式不符合 DNS 标准",
		}
	}
	return nil
}

// validateLabels 验证域名标签（各个部分）
func (v *DomainValidator) validateLabels(domain string) error {
	labels := strings.Split(domain, ".")

	// 至少需要两个标签（如 example.com）
	if len(labels) < 2 {
		return &DomainValidationError{
			Domain: domain,
			Reason: "域名至少需要包含两个部分（如 example.com）",
		}
	}

	// 顶级域名检查（最后一个标签）
	if err := v.validateTLD(labels[len(labels)-1]); err != nil {
		return err
	}

	// 其他标签的字符/长度合法性由 govalidator.IsDNSName 覆盖
	return nil
}

// validateTLD 验证顶级域名
func (v *DomainValidator) validateTLD(tld string) error {
	// 顶级域名必须至少 2 个字符
	if len(tld) < 2 {
		return &DomainValidationError{
			Domain: tld,
			Reason: "顶级域名至少需要 2 个字符",
		}
	}

	// 顶级域名只能包含字母（使用 govalidator 的字母验证）
	if !govalidator.IsAlpha(tld) {
		return &DomainValidationError{
			Domain: tld,
			Reason: "顶级域名只能包含字母",
		}
	}

	return nil
}

// isSubdomain 检查是否为子域名
func (v *DomainValidator) isSubdomain(domain string) bool {
	labels := strings.Split(domain, ".")
	// 超过 2 个标签通常表示子域名（如 www.example.com）
	return len(labels) > 2
}

// validateDNS 进行 DNS 解析验证
func (v *DomainValidator) validateDNS(domain string) error {
	// 尝试解析域名
	_, err := net.LookupHost(domain)
	if err != nil {
		return &DomainValidationError{
			Domain: domain,
			Reason: fmt.Sprintf("DNS 解析失败: %v", err),
		}
	}
	return nil
}

// 便捷函数：使用默认验证器验证单个域名
func ValidateDomain(domain string) error {
	validator := NewDomainValidator()
	return validator.ValidateDomain(domain)
}

// 便捷函数：使用默认验证器批量验证域名
func ValidateDomains(domains []string) []error {
	validator := NewDomainValidator()
	return validator.ValidateDomains(domains)
}

// 便捷函数：验证子域名（更严格的验证）
func ValidateSubdomain(subdomain string) error {
	validator := NewDomainValidator()
	
	// 子域名必须至少包含 3 个部分（如 www.example.com）
	labels := strings.Split(subdomain, ".")
	if len(labels) < 3 {
		return &DomainValidationError{
			Domain: subdomain,
			Reason: "子域名必须至少包含 3 个部分（如 www.example.com）",
		}
	}
	
	return validator.ValidateDomain(subdomain)
}

// 便捷函数：批量验证子域名
func ValidateSubdomains(subdomains []string) []error {
	var errors []error
	for _, subdomain := range subdomains {
		if err := ValidateSubdomain(subdomain); err != nil {
			errors = append(errors, err)
		}
	}
	return errors
}

// IsSubdomainOf 检查 subdomain 是否是 parentDomain 的子域名
// 例如：
// - www.example.com 是 example.com 的子域名 ✓
// - api.example.com 是 example.com 的子域名 ✓  
// - example.com 不是 example.com 的子域名（自己不是自己的子域名）✗
// - test.com 不是 example.com 的子域名 ✗
func IsSubdomainOf(subdomain, parentDomain string) bool {
	subdomain = strings.TrimSpace(strings.ToLower(subdomain))
	parentDomain = strings.TrimSpace(strings.ToLower(parentDomain))
	
	// 子域名必须以 ".父域名" 结尾
	// 例如：www.example.com 以 .example.com 结尾
	suffix := "." + parentDomain
	return strings.HasSuffix(subdomain, suffix)
}

// ValidateSubdomainBelongsTo 验证子域名是否属于指定的父域名
func ValidateSubdomainBelongsTo(subdomain, parentDomain string) error {
	subdomain = strings.TrimSpace(subdomain)
	parentDomain = strings.TrimSpace(parentDomain)
	
	if subdomain == "" {
		return &DomainValidationError{
			Domain: subdomain,
			Reason: "子域名不能为空",
		}
	}
	
	if parentDomain == "" {
		return &DomainValidationError{
			Domain: parentDomain,
			Reason: "父域名不能为空",
		}
	}
	
	// 检查子域名是否属于父域名
	if !IsSubdomainOf(subdomain, parentDomain) {
		return &DomainValidationError{
			Domain: subdomain,
			Reason: fmt.Sprintf("'%s' 不是 '%s' 的子域名", subdomain, parentDomain),
		}
	}
	
	return nil
}
