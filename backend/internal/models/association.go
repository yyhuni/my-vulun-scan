package models

// OrganizationDomain 组织域名关联模型（多对多中间表）
// 在此定义外键约束，删除组织或域名时自动删除关联记录
type OrganizationDomain struct {
	OrganizationID uint `json:"organization_id" gorm:"primaryKey"`
	DomainID       uint `json:"domain_id" gorm:"primaryKey"`

	// 关联关系 - 定义外键级联删除约束
	Organization *Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	Domain       *Domain       `json:"domain,omitempty" gorm:"foreignKey:DomainID;constraint:OnDelete:CASCADE"`
}
