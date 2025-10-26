/**
 * Mock 数据 - 端点
 */

import type { Endpoint } from "@/types/endpoint.types"

export const mockEndpoints: Endpoint[] = [
  {
    id: 1,
    url: "https://www.taobao.com",
    method: "GET",
    statusCode: 200,
    title: "淘宝首页",
    contentLength: 45678,
    domainId: 1,
    domain: "www.taobao.com",
    updatedAt: "2024-01-15T00:00:00Z",
  },
  {
    id: 2,
    url: "https://www.taobao.com/api/user",
    method: "GET",
    statusCode: 200,
    title: "淘宝用户API",
    contentLength: 1234,
    domainId: 1,
    domain: "www.taobao.com",
    updatedAt: "2024-01-16T00:00:00Z",
  },
  {
    id: 3,
    url: "https://m.taobao.com",
    method: "GET",
    statusCode: 200,
    title: "淘宝移动首页",
    contentLength: 34567,
    domainId: 2,
    domain: "m.taobao.com",
    updatedAt: "2024-01-17T00:00:00Z",
  },
  {
    id: 4,
    url: "https://login.taobao.com/member/login.jhtml",
    method: "POST",
    statusCode: 302,
    title: "淘宝登录页",
    contentLength: 2345,
    domainId: 3,
    domain: "login.taobao.com",
    updatedAt: "2024-01-18T00:00:00Z",
  },
]

let nextEndpointId = 5
export const getNextEndpointId = () => nextEndpointId++
