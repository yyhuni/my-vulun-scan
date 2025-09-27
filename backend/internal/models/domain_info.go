package models

import (
	"time"

	"gorm.io/gorm"
)

// DomainInfo 域名详细信息聚合容器
type DomainInfo struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// DNS安全信息
	DNSSEC bool `json:"dnssec" gorm:"default:false"`

	// 域名生命周期时间
	Created *time.Time `json:"created,omitempty"`
	Updated *time.Time `json:"updated,omitempty"`
	Expires *time.Time `json:"expires,omitempty"`

	// 地理位置信息
	GeolocationISO string `json:"geolocation_iso" gorm:"size:10"`

	// WHOIS信息
	WhoisServer      string      `json:"whois_server" gorm:"size:150"`
	RegistrationInfo interface{} `json:"registration_info,omitempty" gorm:"type:jsonb"`

	// 关联关系
	Domain *Domain `json:"domain,omitempty" gorm:"foreignKey:DomainInfoID;constraint:OnDelete:CASCADE"`

	// Many2Many 关联（可选）
	Statuses       []DomainStatus  `json:"statuses,omitempty" gorm:"many2many:domain_info_statuses;constraint:OnDelete:CASCADE"`
	NameServers    []NameServer    `json:"name_servers,omitempty" gorm:"many2many:domain_info_name_servers;constraint:OnDelete:CASCADE"`
	DNSRecords     []DNSRecord     `json:"dns_records,omitempty" gorm:"many2many:domain_info_dns_records;constraint:OnDelete:CASCADE"`
	RelatedDomains []RelatedDomain `json:"related_domains,omitempty" gorm:"many2many:domain_info_related_domains;constraint:OnDelete:CASCADE"`
	RelatedTLDs    []RelatedTLD    `json:"related_tlds,omitempty" gorm:"many2many:domain_info_related_tlds;constraint:OnDelete:CASCADE"`
	SimilarDomains []SimilarDomain `json:"similar_domains,omitempty" gorm:"many2many:domain_info_similar_domains;constraint:OnDelete:CASCADE"`
	HistoricalIPs  []HistoricalIP  `json:"historical_ips,omitempty" gorm:"many2many:domain_info_historical_ips;constraint:OnDelete:CASCADE"`
}

// DomainStatus 域名状态信息
type DomainStatus struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"uniqueIndex;not null;size:255"`
}

// NameServer 域名服务器信息
type NameServer struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"uniqueIndex;not null;size:255"`
}

// DNSRecord DNS记录信息
type DNSRecord struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"not null;size:255"`
	Type string `json:"type" gorm:"not null;size:50"`
}

// RelatedDomain 相关域名信息
type RelatedDomain struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"uniqueIndex;not null;size:255"`
}

// RelatedTLD 相关顶级域名信息
type RelatedTLD struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"uniqueIndex;not null;size:50"`
}

// SimilarDomain 相似域名信息
type SimilarDomain struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	Name string `json:"name" gorm:"uniqueIndex;not null;size:255"`
}

// HistoricalIP 历史IP地址信息
type HistoricalIP struct {
	// 数据库基础字段
	ID        uint           `json:"id" gorm:"primaryKey;autoIncrement"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// 业务字段
	IP       string `json:"ip" gorm:"not null;size:150"`
	Location string `json:"location" gorm:"not null;size:255"`
	Owner    string `json:"owner" gorm:"not null;size:255"`
	LastSeen string `json:"last_seen" gorm:"not null;size:100"`
}
