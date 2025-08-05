/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发模式配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },

  // 根据环境动态配置
  ...(process.env.NODE_ENV === 'production' 
    ? {
        // 生产模式：静态导出
        output: 'export',
        trailingSlash: true,
        distDir: 'dist',
        // 修复Go服务器中的静态资源路径问题
        assetPrefix: '/static',
        basePath: '/static',
      } 
    : {
        // 开发模式：API代理
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'http://localhost:7400/api/:path*',
            },
          ]
        },
        // 添加CORS头支持跨域
        async headers() {
          return [
            {
              source: '/api/:path*',
              headers: [
                { key: 'Access-Control-Allow-Credentials', value: 'true' },
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
                { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
              ],
            },
          ]
        },
      }
  ),

  // async headers() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       headers: [
  //         { key: 'Access-Control-Allow-Credentials', value: 'true' },
  //         { key: 'Access-Control-Allow-Origin', value: '*' },
  //         { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
  //         { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
  //       ],
  //     },
  //   ]
  // },
}

export default nextConfig
