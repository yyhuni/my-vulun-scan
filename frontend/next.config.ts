import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 禁用 Next.js 自动添加/移除末尾斜杠的行为
  // 让我们手动控制 URL 格式
  skipTrailingSlashRedirect: true,
  
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
