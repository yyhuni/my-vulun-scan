/**
 * MSW 浏览器配置
 * 用于拦截浏览器中的 API 请求
 */

import { setupWorker } from "msw/browser"
import { handlers } from "./handlers"

export const worker = setupWorker(...handlers)
