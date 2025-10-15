package models

// HealthStatusResponseData 健康检查响应数据
type HealthStatusResponseData struct {
	Status    string `json:"status"`    // 服务状态，如 "ok"
	Timestamp int64  `json:"timestamp"` // 当前时间戳（Unix时间）
}
