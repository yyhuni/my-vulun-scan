package utils

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/PuerkitoBio/purell"
	"golang.org/x/net/publicsuffix"
)

// ValidateURL 验证 URL（统一验证入口）
// 注意：此函数只做验证，不修改输入。请先调用 NormalizeURL 进行规范化
func ValidateURL(urlStr string) error {
	const maxLength = 2048

	if urlStr == "" {
		return fmt.Errorf("URL 不能为空")
	}
	if len(urlStr) > maxLength {
		return fmt.Errorf("URL 长度超过限制 (%d 字符)", maxLength)
	}

	u, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("URL 解析失败: %w", err)
	}

	// 1) 协议大小写不敏感
	if !strings.EqualFold(u.Scheme, "http") && !strings.EqualFold(u.Scheme, "https") {
		return fmt.Errorf("只支持 HTTP 和 HTTPS 协议")
	}

	// 2) 主机存在性
	if u.Host == "" || u.Hostname() == "" {
		return fmt.Errorf("URL 必须包含有效的主机名")
	}

	// 3) 端口合法性（如果提供了端口）
	if p := u.Port(); p != "" {
		portNum, err := strconv.Atoi(p)
		if err != nil || portNum < 1 || portNum > 65535 {
			return fmt.Errorf("URL 端口无效")
		}
	}

	return nil
}

// NormalizeURL 规范化 URL，处理等价但写法不同的 URL
// 使用 purell 库实现完整的 RFC 3986 规范化
//
// 处理内容：
// - 大小写规范化：HTTPS://Example.COM -> https://example.com
// - 默认端口移除：https://example.com:443 -> https://example.com
// - 尾部斜杠移除：https://example.com/api/ -> https://example.com/api
// - Fragment 移除：https://example.com/api#section -> https://example.com/api
// - 重复斜杠移除：https://example.com//api -> https://example.com/api
// - 解码不必要的转义：%7E -> ~
// - 查询参数排序：?b=2&a=1 -> ?a=1&b=2
//
// 示例：
//
//	NormalizeURL("HTTPS://Example.COM:443/API/#section")
//	=> "https://example.com/api"
func NormalizeURL(urlStr string) (string, error) {
	// 去除首尾空格
	urlStr = strings.TrimSpace(urlStr)

	if urlStr == "" {
		return "", fmt.Errorf("URL 不能为空")
	}

	// 使用 purell 进行完整规范化
	normalized, err := purell.NormalizeURLString(urlStr,
		purell.FlagLowercaseScheme| // 小写 scheme (HTTPS -> https)
			purell.FlagLowercaseHost| // 小写 host (Example.COM -> example.com)
			purell.FlagRemoveDefaultPort| // 移除默认端口 (:443, :80)
			purell.FlagRemoveFragment| // 移除 fragment (#section)
			purell.FlagRemoveDuplicateSlashes| // 移除重复斜杠 (// -> /)
			purell.FlagRemoveTrailingSlash| // 移除尾部斜杠 (/api/ -> /api)
			purell.FlagDecodeUnnecessaryEscapes| // 解码不必要的转义 (%7E -> ~)
			purell.FlagEncodeNecessaryEscapes| // 编码必要的字符
			purell.FlagSortQuery, // 排序查询参数 (?b=2&a=1 -> ?a=1&b=2)
	)

	if err != nil {
		return "", fmt.Errorf("failed to normalize URL: %w", err)
	}

	return normalized, nil
}

// ExtractHostFromURL 从 URL 中提取主机名（不含端口）
// 例如: https://api.example.com:8080/path -> api.example.com
// 注意：请先调用 NormalizeURL 进行规范化
func ExtractHostFromURL(rawURL string) (string, error) {
	if rawURL == "" {
		return "", fmt.Errorf("URL 不能为空")
	}

	u, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	if host := u.Hostname(); host == "" {
		return "", fmt.Errorf("URL has no host")
	}
	return u.Hostname(), nil
}

// ExtractRootDomain 使用 Public Suffix List 提取可注册的根域名（eTLD+1）
// 例如:
//
//	api.example.com -> example.com
//	www.example.co.uk -> example.co.uk
//	example.com -> example.com
//
// 若解析失败则回退返回原 host
// 注意：请传入已规范化的 host
func ExtractRootDomain(host string) (string, error) {
	if host == "" {
		return "", fmt.Errorf("host 不能为空")
	}

	if etld1, err := publicsuffix.EffectiveTLDPlusOne(host); err == nil {
		return etld1, nil
	}
	// 回退：直接返回原始 host（例如 IP 或非标准域名）
	return host, nil
}
