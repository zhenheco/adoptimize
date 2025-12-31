/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 設定 Python 後端 API URL
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: `${process.env.PYTHON_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },

  // 圖片優化設定
  images: {
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
