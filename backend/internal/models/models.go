package models

// GetAllModels 返回所有需要迁移的模型
func GetAllModels() []interface{} {
	return []interface{}{
		&Organization{},
		&Domain{},
		&DomainInfo{},
		&OrganizationDomain{},
		&SubDomain{},
		&ScanTask{},
		&ScanResult{},
		&Vulnerability{},
		&DomainStatus{},
		&NameServer{},
		&DNSRecord{},
		&RelatedDomain{},
		&RelatedTLD{},
		&SimilarDomain{},
		&HistoricalIP{},
	}
}
