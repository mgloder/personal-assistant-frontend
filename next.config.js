/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    // Use localhost in development, backend service name in production
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'http://backend:8005'
      : 'http://localhost:8005';

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
        {
          source: '/auth/login',
          destination: `${backendUrl}/auth/login`,
        },
        {
          source: '/auth/:path*',
          destination: `${backendUrl}/auth/:path*`,
        },
        {
          source: '/chat',
          destination: `${backendUrl}/chat`,
        },
        {
          source: '/chat/:path*',
          destination: `${backendUrl}/chat/:path*`,
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