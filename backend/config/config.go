package config

import (
	"log"
	"os"
	"strconv"

	"github.com/spf13/viper"
)

// Config 应用配置结构
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Security SecurityConfig `mapstructure:"security"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	Mode         string `mapstructure:"mode"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
	MaxConns int    `mapstructure:"max_conns"`
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	JWTSecret     string `mapstructure:"jwt_secret"`
	JWTExpiryHour int    `mapstructure:"jwt_expiry_hour"`
}

var AppConfig *Config

// LoadConfig 加载配置
func LoadConfig() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")

	// 设置默认值
	setDefaults()

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: config file not found, using default values: %v", err)
	}

	// 允许环境变量覆盖
	viper.AutomaticEnv()

	// 解析配置到结构体
	if err := viper.Unmarshal(&AppConfig); err != nil {
		return err
	}

	return nil
}

// setDefaults 设置默认配置值
func setDefaults() {
	// 服务器默认配置
	viper.SetDefault("server.host", "localhost")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.mode", "release")
	viper.SetDefault("server.read_timeout", 15)
	viper.SetDefault("server.write_timeout", 15)

	// 数据库默认配置
	viper.SetDefault("database.host", getEnv("DB_HOST", "localhost"))
	viper.SetDefault("database.port", getEnvAsInt("DB_PORT", 5432))
	viper.SetDefault("database.user", getEnv("DB_USER", "postgres"))
	viper.SetDefault("database.password", getEnv("DB_PASSWORD", "postgres"))
	viper.SetDefault("database.dbname", getEnv("DB_NAME", "vulun_scan"))
	viper.SetDefault("database.sslmode", getEnv("DB_SSLMODE", "disable"))
	viper.SetDefault("database.max_conns", getEnvAsInt("DB_MAX_CONNS", 10))

	// 安全默认配置
	viper.SetDefault("security.jwt_secret", getEnv("JWT_SECRET", "your-secret-key"))
	viper.SetDefault("security.jwt_expiry_hour", getEnvAsInt("JWT_EXPIRY_HOUR", 24))
}

// GetConfig 获取配置实例
func GetConfig() *Config {
	if AppConfig == nil {
		if err := LoadConfig(); err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}
	}
	return AppConfig
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
