package handlers

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// ParseUintParam 解析 URL 路径中的 uint 参数
// 返回解析后的值和错误，由调用者决定如何处理错误
func ParseUintParam(c *gin.Context, paramName string) (uint, error) {
	idStr := c.Param(paramName)
	if idStr == "" {
		log.Warn().
			Str("param_name", paramName).
			Str("path", c.Request.URL.Path).
			Msg("Parameter is empty")
		return 0, fmt.Errorf("%s不能为空", paramName)
	}

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		log.Warn().
			Err(err).
			Str("param_name", paramName).
			Str("param_value", idStr).
			Str("path", c.Request.URL.Path).
			Msg("Failed to parse parameter as uint")
		return 0, fmt.Errorf("无效的%s", paramName)
	}

	return uint(id), nil
}

// ParseUintFromString 解析字符串为 uint
// 返回解析后的值和错误，由调用者决定如何处理错误
func ParseUintFromString(str string) (uint, error) {
	if str == "" {
		return 0, fmt.Errorf("字符串不能为空")
	}

	id, err := strconv.ParseUint(str, 10, 32)
	if err != nil {
		log.Warn().
			Err(err).
			Str("value", str).
			Msg("Failed to parse string as uint")
		return 0, fmt.Errorf("无效的数字格式")
	}

	return uint(id), nil
}
