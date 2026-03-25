import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/', '/api/internal/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/api/listings', '/api/areas', '/api-spec.json'],
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/api/listings', '/api/areas', '/api-spec.json'],
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/api/listings', '/api/areas', '/api-spec.json'],
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/api/listings', '/api/areas', '/api-spec.json'],
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: ['/dashboard/', '/account/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/dashboard/', '/account/', '/login/', '/signup/'],
      },
      {
        userAgent: 'FacebookBot',
        allow: '/',
        disallow: ['/dashboard/', '/account/'],
      },
      // Block SEO competitive intelligence crawlers
      {
        userAgent: 'AhrefsBot',
        disallow: '/',
      },
      {
        userAgent: 'SemrushBot',
        disallow: '/',
      },
      {
        userAgent: 'MJ12bot',
        disallow: '/',
      },
    ],
    sitemap: 'https://rentdanang.app/sitemap.xml',
    host: 'https://rentdanang.app',
  }
}
