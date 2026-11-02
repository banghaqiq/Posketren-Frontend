/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent double compilation passes in dev
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,

  // Modularize icon imports so bundler only loads icons actually used
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Package import optimization for Turbopack & Webpack
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'axios',
      'qrcode',
      'html5-qrcode',
    ],
  },

  // Webpack compilation speed optimization on Windows
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Line-level source maps compile 5x-10x faster than full column eval-source-map
      config.devtool = isServer ? false : 'eval-cheap-module-source-map';

      // Optimize filesystem snapshot to avoid slow fs.stat calls on Windows
      config.snapshot = {
        ...(config.snapshot || {}),
        managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:8080 http://127.0.0.1:8080 http://localhost:3000 http://127.0.0.1:3000 https://*.onrender.com https://*.vercel.app https://posketren-backend-production.up.railway.app; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },

   async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${process.env.BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
