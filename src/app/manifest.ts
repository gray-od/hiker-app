import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ProHikes — Планування походів',
    short_name: 'ProHikes',
    description: 'Застосунок для планування туристичного спорядження та розкладок харчування',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#75a93a',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
