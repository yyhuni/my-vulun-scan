package models

// GetAllModels 返回所有需要迁移的模型
func GetAllModels() []interface{} {
	return []interface{}{
		&Organization{},
		&Domain{},
		&OrganizationDomain{},
		&SubDomain{},
		&Endpoint{},
		&Tool{},
	}
}
