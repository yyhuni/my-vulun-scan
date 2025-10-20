---
trigger: always_on
---

1.后端网页应该是 8888 端口
2.后端请运行虚拟环境source venv/bin/activate 再运行命令
4.网页测试可以用 curl
8.所有前端 api 接口都应该写在@services 中，所有 type 类型都应该写在@types 中

10.前端的加载等逻辑用 React Query来实现，自动管理

14.注意前端的驼峰命名，后端的下划线命名，这之间会自动的转换，通过front/lib/api-client.ts文件进行的
15.注意：api-client.ts 的 snakecaseKeys 只转换请求体（body）和查询参数对象（params），不转换手动构建的 URL 查询字符串中的值，所以需要在写代码过程中不要手动构建 url，而是要使用 params 对象，params 是对象，拦截器可以转换
17.所有业务操作的 toast 都放在 hook 中
19.目前后端项目，去不用做安全漏洞方面的相关的代码
23.前端非必要不要采用window.location.href去跳转，而是用Next.js 客户端路由
24.前端 toast应该自己控制用户提示的内容和风格，而不是直接使用后端的 message来打印，同时也要控制台打印后端的响应体
25.前端通用的响应应该写在api-response.types.ts中