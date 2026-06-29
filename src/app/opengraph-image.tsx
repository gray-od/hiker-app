import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'ProHikes — Планування походів';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logoData = await readFile(join(process.cwd(), 'public', 'og-logo.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--color-brand-hover) 0%, var(--color-brand) 50%, #8bc34a 100%)',
        }}
      >
        <img
          src={logoSrc}
          width={180}
          height={180}
          style={{ borderRadius: '50%', marginBottom: 32 }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
          }}
        >
          ProHikes
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          Планування походів
        </div>
      </div>
    ),
    { ...size },
  );
}
