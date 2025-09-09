package services

import (
	"database/sql"
	"fmt"

	"vulun-scan-backend/internal/models"
	"vulun-scan-backend/pkg/database"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// OrganizationService 组织服务
type OrganizationService struct {
	db *sql.DB
}

// NewOrganizationService 创建组织服务实例
func NewOrganizationService() *OrganizationService {
	return &OrganizationService{
		db: database.GetDB(),
	}
}

// GetOrganizations 获取所有组织
func (s *OrganizationService) GetOrganizations() ([]models.Organization, error) {
	query := `
		SELECT id, name, description, created_at
		FROM organizations
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		logrus.WithError(err).Error("Failed to query organizations")
		return nil, err
	}
	defer rows.Close()

	var organizations []models.Organization
	for rows.Next() {
		var org models.Organization
		err := rows.Scan(&org.ID, &org.Name, &org.Description, &org.CreatedAt)
		if err != nil {
			logrus.WithError(err).Error("Failed to scan organization")
			return nil, err
		}
		organizations = append(organizations, org)
	}

	if err = rows.Err(); err != nil {
		logrus.WithError(err).Error("Error iterating organizations")
		return nil, err
	}

	return organizations, nil
}

// GetOrganizationByID 根据ID获取组织
func (s *OrganizationService) GetOrganizationByID(id string) (*models.Organization, error) {
	query := `
		SELECT id, name, description, created_at
		FROM organizations
		WHERE id = $1
	`

	var org models.Organization
	err := s.db.QueryRow(query, id).Scan(&org.ID, &org.Name, &org.Description, &org.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("organization not found")
		}
		logrus.WithError(err).Error("Failed to query organization")
		return nil, err
	}

	return &org, nil
}

// CreateOrganization 创建组织
func (s *OrganizationService) CreateOrganization(req models.CreateOrganizationRequest) (*models.Organization, error) {
	id := uuid.New().String()

	query := `
		INSERT INTO organizations (id, name, description, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, name, description, created_at
	`

	var org models.Organization
	err := s.db.QueryRow(query, id, req.Name, req.Description).Scan(
		&org.ID, &org.Name, &org.Description, &org.CreatedAt)
	if err != nil {
		logrus.WithError(err).Error("Failed to create organization")
		return nil, err
	}

	logrus.WithFields(logrus.Fields{
		"id":   org.ID,
		"name": org.Name,
	}).Info("Organization created successfully")

	return &org, nil
}

// UpdateOrganization 更新组织
func (s *OrganizationService) UpdateOrganization(req models.UpdateOrganizationRequest) (*models.Organization, error) {
	query := `
		UPDATE organizations
		SET name = $2, description = $3, updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, description, created_at
	`

	var org models.Organization
	err := s.db.QueryRow(query, req.ID, req.Name, req.Description).Scan(
		&org.ID, &org.Name, &org.Description, &org.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("organization not found")
		}
		logrus.WithError(err).Error("Failed to update organization")
		return nil, err
	}

	logrus.WithFields(logrus.Fields{
		"id":   org.ID,
		"name": org.Name,
	}).Info("Organization updated successfully")

	return &org, nil
}

// DeleteOrganization 删除组织
func (s *OrganizationService) DeleteOrganization(organizationID string) error {
	query := `DELETE FROM organizations WHERE id = $1`

	result, err := s.db.Exec(query, organizationID)
	if err != nil {
		logrus.WithError(err).Error("Failed to delete organization")
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logrus.WithError(err).Error("Failed to get rows affected")
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("organization not found")
	}

	logrus.WithField("id", organizationID).Info("Organization deleted successfully")
	return nil
}
