/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verification builds go to their own folder so a running dev server is untouched.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  experimental: {
    // shadcn imports every primitive through the radix-ui umbrella; without this
    // each page downloads Dialog, Select and the rest whether it uses them or not.
    optimizePackageImports: ['radix-ui'],
    // Photo uploads go through a server action. The browser shrinks photos to
    // about 1 MB first, well under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: '6mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // An operator tool: never framed, never indexed, never cached by a proxy.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}
export default nextConfig
