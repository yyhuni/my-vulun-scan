package database

import (
	"fmt"
	"sync"
	"time"

	"vulun-scan-backend/config"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	// db 数据库连接实例（使用小写，不直接暴露）
	db *gorm.DB
	// once 确保数据库只初始化一次
	once sync.Once
	// initErr 记录初始化时的错误
	initErr error
)

// InitDB 初始化数据库连接（使用 sync.Once 确保并发安全）
func InitDB() {
	once.Do(func() {
		cfg := config.GetConfig()

		// 先连接到 postgres 系统数据库来创建目标数据库
		systemDSN := fmt.Sprintf("host=%s user=%s password=%s dbname=postgres port=%d sslmode=%s TimeZone=Asia/Shanghai",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.Port,
			cfg.Database.SSLMode,
		)

		// 临时连接到系统数据库
		systemDB, err := gorm.Open(postgres.Open(systemDSN), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Silent), // 静默模式，避免过多日志
		})
		if err != nil {
			initErr = fmt.Errorf("failed to connect to system database: %w", err)
			log.Fatal().Err(err).Msg("Failed to connect to system database")
			return
		}

		// 检查数据库是否存在
		var count int64
		checkQuery := fmt.Sprintf("SELECT COUNT(*) FROM pg_database WHERE datname = '%s'", cfg.Database.DBName)
		systemDB.Raw(checkQuery).Row().Scan(&count)

		// 如果数据库不存在，创建它
		if count == 0 {
			log.Info().Str("database", cfg.Database.DBName).Msg("Database does not exist, creating...")
			createQuery := fmt.Sprintf("CREATE DATABASE %s", cfg.Database.DBName)
			if err := systemDB.Exec(createQuery).Error; err != nil {
				initErr = fmt.Errorf("failed to create database: %w", err)
				log.Fatal().Err(err).Str("database", cfg.Database.DBName).Msg("Failed to create database")
				return
			}
			log.Info().Str("database", cfg.Database.DBName).Msg("Database created successfully")
		} else {
			log.Info().Str("database", cfg.Database.DBName).Msg("Database already exists")
		}

		// 关闭系统数据库连接
		sqlDB, _ := systemDB.DB()
		sqlDB.Close()

		// 构建目标数据库连接字符串
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s TimeZone=Asia/Shanghai",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Password,
			cfg.Database.DBName,
			cfg.Database.Port,
			cfg.Database.SSLMode,
		)

		// 配置GORM
		gormConfig := &gorm.Config{
			Logger:                                   logger.Default.LogMode(logger.Info), // 开启SQL日志
			DisableForeignKeyConstraintWhenMigrating: false,                               // 确保创建外键约束（包括 CASCADE）
		}

		// 连接到目标数据库
		db, err = gorm.Open(postgres.Open(dsn), gormConfig)
		if err != nil {
			initErr = fmt.Errorf("failed to connect to target database: %w", err)
			log.Fatal().Err(err).Msg("Failed to connect to target database")
			return
		}

		// 获取底层sql.DB进行连接池配置
		sqlDB, err = db.DB()
		if err != nil {
			initErr = fmt.Errorf("failed to get underlying sql.DB: %w", err)
			log.Fatal().Err(err).Msg("Failed to get underlying sql.DB")
			return
		}

		// 配置连接池
		sqlDB.SetMaxOpenConns(cfg.Database.MaxConns)
		sqlDB.SetMaxIdleConns(cfg.Database.MaxConns / 2)
		sqlDB.SetConnMaxLifetime(5 * time.Minute)

		// 测试连接
		if err = sqlDB.Ping(); err != nil {
			initErr = fmt.Errorf("failed to ping database: %w", err)
			log.Fatal().Err(err).Msg("Failed to ping database")
			return
		}

		log.Info().Msg("Database connection established successfully with GORM")
	})
}

// GetDB 获取GORM数据库连接实例（带空指针检查）
func GetDB() *gorm.DB {
	if db == nil {
		log.Fatal().Msg("Database not initialized. Please call InitDB() first.")
	}
	return db
}

// CloseDB 关闭数据库连接
func CloseDB() {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			log.Error().Err(err).Msg("Failed to get underlying sql.DB for closing")
			return
		}

		if err := sqlDB.Close(); err != nil {
			log.Error().Err(err).Msg("Failed to close database connection")
		} else {
			log.Info().Msg("Database connection closed")
		}
	}
}

// HealthCheck 数据库健康检查
func HealthCheck() error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	return sqlDB.Ping()
}

// AutoMigrate 自动迁移数据库模式
func AutoMigrate(models ...interface{}) error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	log.Info().Msg("Starting database auto migration...")
	err := db.AutoMigrate(models...)
	if err != nil {
		log.Error().Err(err).Msg("Failed to auto migrate database")
		return err
	}

	log.Info().Msg("Database auto migration completed successfully")

	// 确保外键约束为 CASCADE
	// GORM 的 AutoMigrate 不会修改已存在的外键约束，需要手动修复
	log.Info().Msg("Ensuring CASCADE constraints...")
	if err := EnsureCascadeConstraints(); err != nil {
		log.Error().Err(err).Msg("Failed to ensure CASCADE constraints")
		return err
	}

	log.Info().Msg("CASCADE constraints ensured successfully")
	return nil
}

// EnsureCascadeConstraints 确保所有外键约束都设置为 ON DELETE CASCADE
// 
// 背景：GORM 的 AutoMigrate 不会修改已存在的外键约束，即使模型中配置了 constraint:OnDelete:CASCADE
// 这是 GORM 的设计限制，不是 bug。详见：
// - https://github.com/go-gorm/gorm/issues/4289
// - https://github.com/go-gorm/gorm/issues/5559
//
// 解决方案：在每次启动时，手动删除并重建外键约束，确保它们符合模型定义
func EnsureCascadeConstraints() error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// 定义需要重建的外键约束
	// 格式：表名, 约束名, 外键列, 引用表, 引用列
	constraints := []struct {
		TableName      string
		ConstraintName string
		ForeignKey     string
		References     string
		ReferenceKey   string
	}{
		// sub_domains 表：引用 domains
		{"sub_domains", "fk_domains_sub_domains", "domain_id", "domains", "id"},
		
		// endpoints 表：引用 sub_domains
		{"endpoints", "fk_sub_domains_endpoints", "subdomain_id", "sub_domains", "id"},
		
		// vulnerabilities 表：引用 domains, sub_domains, endpoints
		{"vulnerabilities", "fk_domains_vulnerabilities", "domain_id", "domains", "id"},
		{"vulnerabilities", "fk_sub_domains_vulnerabilities", "subdomain_id", "sub_domains", "id"},
		{"vulnerabilities", "fk_endpoints_vulnerabilities", "end_point_id", "endpoints", "id"},
	}

	// 逐个重建外键约束
	for _, c := range constraints {
		// 删除旧约束（如果存在）
		log.Debug().Str("table", c.TableName).Str("constraint", c.ConstraintName).Msg("Dropping old constraint")
		dropSQL := fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s", c.TableName, c.ConstraintName)
		if err := db.Exec(dropSQL).Error; err != nil {
			log.Warn().Err(err).Str("constraint", c.ConstraintName).Msg("Failed to drop constraint, continuing...")
		}

		// 创建新的 CASCADE 约束
		log.Debug().Str("table", c.TableName).Str("constraint", c.ConstraintName).Msg("Creating CASCADE constraint")
		createSQL := fmt.Sprintf(
			"ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s) ON DELETE CASCADE",
			c.TableName, c.ConstraintName, c.ForeignKey, c.References, c.ReferenceKey,
		)
		if err := db.Exec(createSQL).Error; err != nil {
			// 如果约束已存在，记录警告但继续
			log.Warn().Err(err).Str("constraint", c.ConstraintName).Msg("Failed to create constraint, may already exist")
		}
	}

	log.Info().Int("count", len(constraints)).Msg("CASCADE constraints processed")
	return nil
}

// WithTx 使用事务执行函数
func WithTx(fn func(*gorm.DB) error) error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}
	return db.Transaction(fn)
}
