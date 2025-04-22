import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: false,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BASE_URL}/:path*`, // 스프링 백엔드 주소
      },
    ];
  },

  images: {
    formats: ['image/webp'],
    unoptimized: true,
    domains: [
      '15.165.65.222',
      '172.16.24.53',
      'persimmontree.ddns.net',
      'd19usddqdhhab5.cloudfront.net',
      '172.16.24.72',
    ], // API에서 제공하는 이미지 도메인(IP) (외부 이미지 도메인 허용)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '15.165.65.222',
        port: '8080',
        pathname: '/**',
      },

      {
        protocol: 'http',
        hostname: '172.16.24.53', // 추가된 이미지 서버
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'persimmontree.ddns.net',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'persimmontree.ddns.net',
        port: '8000',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'persimmontree.cloud:443',
        port: '443',
        pathname: '/images/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Link',
            value: `<${process.env.NEXT_PUBLIC_IMAGE_URL}>; rel=preconnect; crossorigin=anonymous`,
          },
        ],
      },
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
