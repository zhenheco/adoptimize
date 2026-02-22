/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // OpenNext.js 必要設定
  output: 'standalone',

  // 設定 Python 後端 API URL（僅供伺服器端使用，不應曝露給客戶端）
  async rewrites() {
    const apiUrl = process.env.PYTHON_API_URL?.trim() || 'http://localhost:8000';
    return [
      {
        source: '/api/python/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // 圖片優化設定 (Cloudflare Workers 需要使用 unoptimized)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
    ],
  },
};

module.exports = nextConfig;
