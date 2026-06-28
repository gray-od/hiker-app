import GPXParser from 'gpxparser';

export interface GpxResult {
  trackName: string;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  maxElevationM: number;
  points: [number, number, number][];
  rawBase64: string;
}

export async function parseGpxFile(file: File): Promise<GpxResult> {
  const text = await file.text();
  const parser = new GPXParser();
  parser.parse(text);

  if (parser.tracks.length === 0) {
    throw new Error('No tracks found in GPX file');
  }

  const track = parser.tracks[0];
  const points: [number, number, number][] = track.points.map(
    (p: { lat: number; lon: number; ele: number }) => [p.lat, p.lon, p.ele],
  );

  let elevGain = track.elevation.pos;
  let elevLoss = track.elevation.neg;
  let maxElev = track.elevation.max;
  let descDistKm: number | null = null;

  const trackDesc = track.desc || '';
  if (trackDesc) {
    const distMatch = trackDesc.match(
      /Відстань:\s*([\d.,]+)\s*км|Distance:\s*([\d.,]+)\s*km/,
    );
    if (distMatch) {
      descDistKm = parseFloat((distMatch[1] || distMatch[2]).replace(',', '.'));
    }
    const gainMatch = trackDesc.match(
      /Загальний підйом:\s*(\d+)\s*м|Total[e]?\s*ascent:\s*(\d+)\s*m/i,
    );
    if (gainMatch) {
      elevGain = parseInt(gainMatch[1] || gainMatch[2], 10);
    }
    const lossMatch = trackDesc.match(
      /Загальний спуск:\s*(\d+)\s*м|Total[e]?\s*descent:\s*(\d+)\s*m/i,
    );
    if (lossMatch) {
      elevLoss = parseInt(lossMatch[1] || lossMatch[2], 10);
    }
    const maxMatch = trackDesc.match(
      /Максимальна висота:\s*(\d+)\s*м|Max[imum]*[e]?\s*elevation:\s*(\d+)\s*m/i,
    );
    if (maxMatch) {
      maxElev = parseInt(maxMatch[1] || maxMatch[2], 10);
    }
  }

  const validPoints = points.filter((p) => p[2] > 0);
  if (!trackDesc && validPoints.length > 1) {
    elevGain = 0;
    elevLoss = 0;
    maxElev = validPoints[0][2];
    for (let i = 1; i < validPoints.length; i++) {
      const diff = validPoints[i][2] - validPoints[i - 1][2];
      if (diff > 3) elevGain += diff;
      else if (diff < -3) elevLoss += Math.abs(diff);
      if (validPoints[i][2] > maxElev) maxElev = validPoints[i][2];
    }
  }

  const reader = new FileReader();
  const rawBase64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const distanceKm =
    descDistKm != null
      ? descDistKm
      : Math.round((track.distance.total / 1000) * 10) / 10;

  return {
    trackName: track.name || file.name.replace(/\.gpx$/i, ''),
    distanceKm,
    elevationGainM: Math.round(elevGain),
    elevationLossM: Math.round(elevLoss),
    maxElevationM: Math.round(maxElev),
    points,
    rawBase64,
  };
}
