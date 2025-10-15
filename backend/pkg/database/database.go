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

		// 配置连接池 - 优化版
		maxOpen := cfg.Database.MaxConns
		if maxOpen == 0 {
			maxOpen = 25 // 默认值
		}
		
		// 最大打开连接数
		sqlDB.SetMaxOpenConns(maxOpen)
		
		// 最大空闲连接数应该接近最大连接数
		// 避免频繁创建和销毁连接，提升性能
		sqlDB.SetMaxIdleConns(maxOpen)
		
		// 连接最大空闲时间（10 分钟未使用则关闭）
		// 防止长期空闲连接占用资源
		sqlDB.SetConnMaxIdleTime(10 * time.Minute)
		
		// 连接最大生命周期（1 小时后强制关闭重建）
		// 防止连接长期持有导致的问题（如数据库重启、网络问题等）
		sqlDB.SetConnMaxLifetime(1 * time.Hour)

		// 测试连接
		if err = sqlDB.Ping(); err != nil {
			initErr = fmt.Errorf("failed to ping database: %w", err)
			log.Fatal().Err(err).Msg("Failed to ping database")
			return
		}

		log.Info().
			Int("max_open_conns", maxOpen).
			Int("max_idle_conns", maxOpen).
			Dur("conn_max_idle_time", 10*time.Minute).
			Dur("conn_max_lifetime", 1*time.Hour).
			Msg("Database connection pool configured successfully")
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
	return nil
}

// WithTx 使用事务执行函数
func WithTx(fn func(*gorm.DB) error) error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}
	return db.Transaction(fn)
}
