package database

import (
	"fmt"
	"time"

	"vulun-scan-backend/config"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
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
		log.Fatal().Err(err).Msg("Failed to connect to system database")
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
			log.Fatal().Err(err).Str("database", cfg.Database.DBName).Msg("Failed to create database")
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
		Logger: logger.Default.LogMode(logger.Info), // 开启SQL日志
	}

	// 连接到目标数据库
	DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to target database")
	}

	// 获取底层sql.DB进行连接池配置
	sqlDB, err = DB.DB()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get underlying sql.DB")
	}

	// 配置连接池
	sqlDB.SetMaxOpenConns(cfg.Database.MaxConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxConns / 2)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// 测试连接
	if err = sqlDB.Ping(); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}

	log.Info().Msg("Database connection established successfully with GORM")
}

// GetDB 获取GORM数据库连接实例
func GetDB() *gorm.DB {
	return DB
}

// CloseDB 关闭数据库连接
func CloseDB() {
	if DB != nil {
		sqlDB, err := DB.DB()
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
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}

	return sqlDB.Ping()
}

// AutoMigrate 自动迁移数据库模式
func AutoMigrate(models ...interface{}) error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	log.Info().Msg("Starting database auto migration...")
	err := DB.AutoMigrate(models...)
	if err != nil {
		log.Error().Err(err).Msg("Failed to auto migrate database")
		return err
	}

	log.Info().Msg("Database auto migration completed successfully")
	return nil
}

// WithTx 使用事务执行函数
func WithTx(fn func(*gorm.DB) error) error {
	return DB.Transaction(fn)
}
