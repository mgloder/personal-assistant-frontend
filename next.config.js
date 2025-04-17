/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://backend:8005/api/:path*',
        },
        {
          source: '/auth/login',
          destination: 'http://backend:8005/auth/login',
        },
        {
          source: '/auth/:path*',
          destination: 'http://backend:8005/auth/:path*',
        },
        {
          source: '/api/chat',
          destination: 'http://backend:8005/api/chat',
        },
        {
          source: '/api/chat/:path*',
          destination: 'http://backend:8005/api/chat/:path*',
        },
      ]
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      }
    ];
  },
  output: 'standalone',
}

module.exports = nextConfig 