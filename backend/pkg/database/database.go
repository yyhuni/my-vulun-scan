package database

import (
	"fmt"
	"time"

	"vulun-scan-backend/config"

	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
	cfg := config.GetConfig()

	// 构建连接字符串
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=%s TimeZone=Asia/Shanghai",
		cfg.Database.Host,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.Port,
		cfg.Database.SSLMode,
	)

	// 配置GORM
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // 开启SQL日志
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to connect database")
	}

	// 获取底层sql.DB进行连接池配置
	sqlDB, err := DB.DB()
	if err != nil {
		logrus.WithError(err).Fatal("Failed to get underlying sql.DB")
	}

	// 配置连接池
	sqlDB.SetMaxOpenConns(cfg.Database.MaxConns)
	sqlDB.SetMaxIdleConns(cfg.Database.MaxConns / 2)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// 测试连接
	if err = sqlDB.Ping(); err != nil {
		logrus.WithError(err).Fatal("Failed to ping database")
	}

	logrus.Info("Database connection established successfully with GORM")
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
			logrus.WithError(err).Error("Failed to get underlying sql.DB for closing")
			return
		}

		if err := sqlDB.Close(); err != nil {
			logrus.WithError(err).Error("Failed to close database connection")
		} else {
			logrus.Info("Database connection closed")
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

	logrus.Info("Starting database auto migration...")
	err := DB.AutoMigrate(models...)
	if err != nil {
		logrus.WithError(err).Error("Failed to auto migrate database")
		return err
	}

	logrus.Info("Database auto migration completed successfully")
	return nil
}

// WithTx 使用事务执行函数
func WithTx(fn func(*gorm.DB) error) error {
	return DB.Transaction(fn)
}
