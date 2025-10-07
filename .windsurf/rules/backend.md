---
trigger: always_on
---

1.后端网页应该是 8888 端口
2.所有接口都要写swagger 注释
4.网页测试可以用 curl
5.用了Scalar API 文档
6.项目使用的是 zerolog 日志框架
7.所有响应应该由 handlers 层返回
8.所有前端 api 接口都应该写在@services 中，所有 type 类型都应该写在@types 中
9.使用 Select(clause.Associations) 自动清理所有关联
10.前端的加载等逻辑用 React Query来实现，自动管理
13.用 GORM 的 Association 方法来简化解除关联的操作
14.注意前端的驼峰命名，后端的下划线命名，这之间会自动的转换，通过front/lib/api-client.ts文件进行的
15.注意：api-client.ts 的 snakecaseKeys 只转换请求体（body）和查询参数对象（params），不转换手动构建的 URL 查询字符串中的值，所以需要在写代码过程中不要手动构建 url，而是要使用 params 对象，params 是对象，拦截器可以转换
16.所有 API 响应必须使用结构化类型，禁止使用 gin.H 或 map[string]interface{}。在 models 包中定义专门的响应结构体（如 XxxResponseData），确保类型安全和 API 文档完整性
17.所有业务操作的 toast 都放在 hook 中