package models

// APIResponse 通用API响应结构
type APIResponse struct {
	Code    string      `json:"code"`           // HTTP状态码，如 "200", "400", "500"
	State   string      `json:"state"`          // 业务状态，如 "success", "error"
	Message string      `json:"message"`        // 响应消息
	Data    interface{} `json:"data,omitempty"` // 响应数据
}
