import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 匹配带斜杠的API路径（保留斜杠）
        {
          source: '/api/:path*/',
          destination: 'http://localhost:8888/api/:path*/',
        },
        // 匹配不带斜杠的API路径（也添加斜杠）
        {
          source: '/api/:path*',
          destination: 'http://localhost:8888/api/:path*/',
        },
      ],
    };
  },
};

export default nextConfig;
