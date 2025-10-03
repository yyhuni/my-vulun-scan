---
trigger: always_on
---

后端：

1.后端网页应该是 8888 端口
2.所有接口都要写swagger 注释
4.网页测试可以用 curl
5.用了Scalar API 文档
6.项目使用的是 zerolog 日志框架
7.所有响应应该由 handlers 层返回
9.使用 Select(clause.Associations) 自动清理所有关联