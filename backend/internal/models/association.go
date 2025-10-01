package models

// OrganizationDomain 组织域名关联模型（多对多中间表）
type OrganizationDomain struct {
	OrganizationID uint `json:"organization_id" gorm:"primaryKey;constraint:OnDelete:CASCADE"`
	DomainID       uint `json:"domain_id" gorm:"primaryKey;constraint:OnDelete:CASCADE"`

	// 关联关系 - GORM 会自动管理多对多关系
	Organization *Organization `json:"organization,omitempty"`
	Domain       *Domain       `json:"domain,omitempty"`
}
