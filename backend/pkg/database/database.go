package database

import (
	"database/sql"
	"fmt"
	"time"

	"vulun-scan-backend/config"

	_ "github.com/lib/pq"
	"github.com/sirupsen/logrus"
)

var DB *sql.DB

// InitDB 初始化数据库连接
func InitDB() {
	cfg := config.GetConfig()

	// 构建连接字符串
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		logrus.WithError(err).Fatal("Failed to open database connection")
	}

	// 配置连接池
	DB.SetMaxOpenConns(cfg.Database.MaxConns)
	DB.SetMaxIdleConns(cfg.Database.MaxConns / 2)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// 测试连接
	if err = DB.Ping(); err != nil {
		logrus.WithError(err).Fatal("Failed to ping database")
	}

	logrus.Info("Database connection established successfully")
}

// GetDB 获取数据库连接实例
func GetDB() *sql.DB {
	return DB
}

// CloseDB 关闭数据库连接
func CloseDB() {
	if DB != nil {
		if err := DB.Close(); err != nil {
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

	return DB.Ping()
}

// WithTx 使用事务执行函数
func WithTx(fn func(*sql.Tx) error) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
