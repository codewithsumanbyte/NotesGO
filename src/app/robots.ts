import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/callback'],
    },
    sitemap: 'https://notesgo.vercel.app/sitemap.xml',
  };
}
