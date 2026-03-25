import { MetadataRoute } from 'next'
import { NEIGHBORHOODS } from '@/lib/neighborhoods'
import { getAllPosts } from '@/lib/blog-content'
import { query } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://rentdanang.app'

  // Static routes
  const routes = [
    '',
    '/blog',
    '/guide',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Neighborhoods
  const neighborhoodRoutes = Object.values(NEIGHBORHOODS).map((area) => ({
    url: `${baseUrl}/rent/${area.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Blog Posts
  const blogRoutes = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Active listings from database
  let listingRoutes: MetadataRoute.Sitemap = []
  try {
    const listings = await query<{ id: string; first_seen_at: string }>(
      `SELECT id, first_seen_at
       FROM v_properties
       WHERE is_active = true AND is_duplicate = false
       ORDER BY first_seen_at DESC
       LIMIT 5000`
    )
    listingRoutes = listings.map((listing) => ({
      url: `${baseUrl}/listings/${listing.id}`,
      lastModified: new Date(listing.first_seen_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch (e) {
    console.error('Sitemap: failed to fetch listings', e)
  }

  return [...routes, ...neighborhoodRoutes, ...blogRoutes, ...listingRoutes]
}
