interface GpxLike {
  distance_km?: number;
  elevation_gain_m?: number;
}

interface ParticipantLike {
  weight_kg?: number;
}

export function getTerrainLimitPct(gpxData?: GpxLike | null): number {
  if (gpxData?.distance_km && gpxData.elevation_gain_m) {
    const elevPerKm = gpxData.elevation_gain_m / gpxData.distance_km;
    if (elevPerKm > 30) return 0.13;
    if (elevPerKm > 15) return 0.17;
    if (elevPerKm > 5) return 0.20;
  }
  return 0.25;
}

export function calcPerPersonMax(participant: ParticipantLike, gpxData?: GpxLike | null): number {
  const bodyGrams = (Number(participant.weight_kg) || 80) * 1000;
  const pct = getTerrainLimitPct(gpxData);
  return Math.round(bodyGrams * pct);
}

export function calcGroupMax(participants: ParticipantLike[], gpxData?: GpxLike | null): number {
  if (participants.length === 0) return 80 * 1000 * getTerrainLimitPct(gpxData);
  const totalBody = participants.reduce((sum, p) => sum + (Number(p.weight_kg) || 80) * 1000, 0);
  return Math.round(totalBody / participants.length * getTerrainLimitPct(gpxData));
}

export function progressColor(pct: number): string {
  if (pct > 100) return 'bg-red-400';
  if (pct > 75) return 'bg-amber-400';
  return 'bg-[#75a93a]';
}

export function textColor(pct: number): string {
  if (pct > 100) return 'text-red-400';
  if (pct > 75) return 'text-amber-400';
  return 'text-[#75a93a]';
}

export function bannerColor(pct: number): string {
  if (pct > 100) return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400';
  if (pct > 75) return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400';
  return 'bg-[#75a93a]/5 border-[#75a93a]/20 text-[#75a93a]';
}
