package services

import (
	"database/sql"
	"fmt"
	"strings"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// DomainService 域名服务
type DomainService struct {
	db *sql.DB
}

// NewDomainService 创建域名服务实例
func NewDomainService() *DomainService {
	return &DomainService{
		db: database.GetDB(),
	}
}

// GetOrganizationMainDomains 获取组织的主域名
func (s *DomainService) GetOrganizationMainDomains(organizationID string) ([]models.MainDomain, error) {
	query := `
		SELECT md.id, md.main_domain_name, md.created_at
		FROM main_domains md
		INNER JOIN organization_main_domains omd ON md.id = omd.main_domain_id
		WHERE omd.organization_id = $1
		ORDER BY md.created_at DESC
	`

	rows, err := s.db.Query(query, organizationID)
	if err != nil {
		logrus.WithError(err).Error("Failed to query organization main domains")
		return nil, err
	}
	defer rows.Close()

	var mainDomains []models.MainDomain
	for rows.Next() {
		var domain models.MainDomain
		err := rows.Scan(&domain.ID, &domain.MainDomainName, &domain.CreatedAt)
		if err != nil {
			logrus.WithError(err).Error("Failed to scan main domain")
			return nil, err
		}
		mainDomains = append(mainDomains, domain)
	}

	if err = rows.Err(); err != nil {
		logrus.WithError(err).Error("Error iterating main domains")
		return nil, err
	}

	return mainDomains, nil
}

// CreateMainDomains 创建主域名并关联到组织
func (s *DomainService) CreateMainDomains(req models.CreateMainDomainsRequest) (*models.APIResponse, error) {
	tx, err := s.db.Begin()
	if err != nil {
		logrus.WithError(err).Error("Failed to begin transaction")
		return nil, err
	}
	defer tx.Rollback()

	var createdCount int
	var existingDomains []string

	for _, domainName := range req.MainDomains {
		// 检查主域名是否已存在
		var existingID string
		checkQuery := `SELECT id FROM main_domains WHERE main_domain_name = $1`
		err := tx.QueryRow(checkQuery, domainName).Scan(&existingID)

		var domainID string
		if err == sql.ErrNoRows {
			// 主域名不存在，创建新的
			domainID = uuid.New().String()
			insertQuery := `
				INSERT INTO main_domains (id, main_domain_name, created_at)
				VALUES ($1, $2, NOW())
			`
			_, err = tx.Exec(insertQuery, domainID, domainName)
			if err != nil {
				logrus.WithError(err).Error("Failed to create main domain")
				return nil, err
			}
		} else if err != nil {
			logrus.WithError(err).Error("Failed to check existing main domain")
			return nil, err
		} else {
			// 主域名已存在
			domainID = existingID
		}

		// 检查组织是否已关联此主域名
		var associationExists bool
		associationQuery := `
			SELECT EXISTS(
				SELECT 1 FROM organization_main_domains 
				WHERE organization_id = $1 AND main_domain_id = $2
			)
		`
		err = tx.QueryRow(associationQuery, req.OrganizationID, domainID).Scan(&associationExists)
		if err != nil {
			logrus.WithError(err).Error("Failed to check domain association")
			return nil, err
		}

		if !associationExists {
			// 创建组织和主域名的关联
			associateQuery := `
				INSERT INTO organization_main_domains (organization_id, main_domain_id)
				VALUES ($1, $2)
			`
			_, err = tx.Exec(associateQuery, req.OrganizationID, domainID)
			if err != nil {
				logrus.WithError(err).Error("Failed to associate main domain with organization")
				return nil, err
			}
			createdCount++
		} else {
			existingDomains = append(existingDomains, domainName)
		}
	}

	if err := tx.Commit(); err != nil {
		logrus.WithError(err).Error("Failed to commit transaction")
		return nil, err
	}

	message := fmt.Sprintf("成功创建 %d 个主域名关联", createdCount)
	if len(existingDomains) > 0 {
		message += fmt.Sprintf("，%d 个域名已存在: %s", len(existingDomains), strings.Join(existingDomains, ", "))
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"success_count":    createdCount,
			"existing_domains": existingDomains,
			"total_requested":  len(req.MainDomains),
		},
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": req.OrganizationID,
		"success_count":   createdCount,
		"total_domains":   len(req.MainDomains),
	}).Info("Main domains created and associated successfully")

	return response, nil
}

// RemoveOrganizationMainDomain 移除组织和主域名的关联
func (s *DomainService) RemoveOrganizationMainDomain(req models.RemoveOrganizationMainDomainRequest) error {
	query := `
		DELETE FROM organization_main_domains 
		WHERE organization_id = $1 AND main_domain_id = $2
	`

	result, err := s.db.Exec(query, req.OrganizationID, req.MainDomainID)
	if err != nil {
		logrus.WithError(err).Error("Failed to remove organization main domain association")
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logrus.WithError(err).Error("Failed to get rows affected")
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": req.OrganizationID,
		"main_domain_id":  req.MainDomainID,
	}).Info("Organization main domain association removed successfully")

	return nil
}

// GetOrganizationSubDomains 获取组织的子域名（分页）
func (s *DomainService) GetOrganizationSubDomains(organizationID string, page, pageSize int) (*models.GetOrganizationSubDomainsResponse, error) {
	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取总数
	countQuery := `
		SELECT COUNT(DISTINCT sd.id)
		FROM sub_domains sd
		INNER JOIN main_domains md ON sd.main_domain_id = md.id
		INNER JOIN organization_main_domains omd ON md.id = omd.main_domain_id
		WHERE omd.organization_id = $1
	`

	var total int
	err := s.db.QueryRow(countQuery, organizationID).Scan(&total)
	if err != nil {
		logrus.WithError(err).Error("Failed to count organization sub domains")
		return nil, err
	}

	// 获取分页数据
	query := `
		SELECT sd.id, sd.sub_domain_name, sd.main_domain_id, sd.status, 
		       sd.created_at, sd.updated_at,
		       md.id as main_domain_id, md.main_domain_name, md.created_at as main_domain_created_at
		FROM sub_domains sd
		INNER JOIN main_domains md ON sd.main_domain_id = md.id
		INNER JOIN organization_main_domains omd ON md.id = omd.main_domain_id
		WHERE omd.organization_id = $1
		ORDER BY sd.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := s.db.Query(query, organizationID, pageSize, offset)
	if err != nil {
		logrus.WithError(err).Error("Failed to query organization sub domains")
		return nil, err
	}
	defer rows.Close()

	var subDomains []models.SubDomain
	for rows.Next() {
		var subDomain models.SubDomain
		var mainDomain models.MainDomain

		err := rows.Scan(
			&subDomain.ID, &subDomain.SubDomainName, &subDomain.MainDomainID, &subDomain.Status,
			&subDomain.CreatedAt, &subDomain.UpdatedAt,
			&mainDomain.ID, &mainDomain.MainDomainName, &mainDomain.CreatedAt,
		)
		if err != nil {
			logrus.WithError(err).Error("Failed to scan sub domain")
			return nil, err
		}

		subDomain.MainDomain = &mainDomain
		subDomains = append(subDomains, subDomain)
	}

	if err = rows.Err(); err != nil {
		logrus.WithError(err).Error("Error iterating sub domains")
		return nil, err
	}

	response := &models.GetOrganizationSubDomainsResponse{
		SubDomains: subDomains,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
	}

	return response, nil
}

// CreateSubDomains 创建子域名
func (s *DomainService) CreateSubDomains(req models.CreateSubDomainsRequest) (*models.APIResponse, error) {
	if req.Status == "" {
		req.Status = "unknown"
	}

	tx, err := s.db.Begin()
	if err != nil {
		logrus.WithError(err).Error("Failed to begin transaction")
		return nil, err
	}
	defer tx.Rollback()

	var createdCount int
	var existingDomains []string

	for _, subDomainName := range req.SubDomains {
		// 检查子域名是否已存在于该主域名下
		var existingID string
		checkQuery := `
			SELECT id FROM sub_domains 
			WHERE sub_domain_name = $1 AND main_domain_id = $2
		`
		err := tx.QueryRow(checkQuery, subDomainName, req.MainDomainID).Scan(&existingID)

		if err == sql.ErrNoRows {
			// 子域名不存在，创建新的
			subDomainID := uuid.New().String()
			insertQuery := `
				INSERT INTO sub_domains (id, sub_domain_name, main_domain_id, status, created_at, updated_at)
				VALUES ($1, $2, $3, $4, NOW(), NOW())
			`
			_, err = tx.Exec(insertQuery, subDomainID, subDomainName, req.MainDomainID, req.Status)
			if err != nil {
				logrus.WithError(err).Error("Failed to create sub domain")
				return nil, err
			}
			createdCount++
		} else if err != nil {
			logrus.WithError(err).Error("Failed to check existing sub domain")
			return nil, err
		} else {
			// 子域名已存在
			existingDomains = append(existingDomains, subDomainName)
		}
	}

	if err := tx.Commit(); err != nil {
		logrus.WithError(err).Error("Failed to commit transaction")
		return nil, err
	}

	message := fmt.Sprintf("成功创建 %d 个子域名", createdCount)
	if len(existingDomains) > 0 {
		message += fmt.Sprintf("，%d 个子域名已存在: %s", len(existingDomains), strings.Join(existingDomains, ", "))
	}

	response := &models.APIResponse{
		Code:    "SUCCESS",
		Message: message,
		Data: map[string]interface{}{
			"success_count":    createdCount,
			"existing_domains": existingDomains,
			"total_requested":  len(req.SubDomains),
		},
	}

	logrus.WithFields(logrus.Fields{
		"main_domain_id": req.MainDomainID,
		"success_count":  createdCount,
		"total_domains":  len(req.SubDomains),
	}).Info("Sub domains created successfully")

	return response, nil
}
