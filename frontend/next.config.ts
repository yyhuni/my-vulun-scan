import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 禁用 Next.js 自动添加/移除末尾斜杠的行为
  // 让我们手动控制 URL 格式
  skipTrailingSlashRedirect: true,
  // 生产构建时不因为 ESLint 报错而中断（保留开发环境的 lint）
  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    return [
      // 只匹配带斜杠的 API 路径
      {
        source: '/api/:path*/',
        destination: 'http://localhost:8888/api/:path*/',
      },
    ];
  },
};

export default nextConfig;
