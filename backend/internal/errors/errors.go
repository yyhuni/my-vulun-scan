package errors

import "errors"

// 自定义业务错误定义
// 使用 errors.New 定义可比较的错误类型，替代字符串比较
// 在 handler 层使用 errors.Is() 判断错误类型

var (
	// Domain 相关错误
	ErrDomainNotFound = errors.New("domain not found")

	// Organization 相关错误
	ErrOrganizationNotFound      = errors.New("organization not found")
	ErrSomeOrganizationsNotExist = errors.New("some organization IDs do not exist")

	// Association 相关错误
	ErrAssociationNotFound = errors.New("association not found")

	// SubDomain 相关错误
	ErrSubDomainNotFound = errors.New("subdomain not found")

	// Endpoint 相关错误
	ErrEndpointNotFound = errors.New("endpoint not found")
)
