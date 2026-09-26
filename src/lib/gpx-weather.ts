import { fetchJson } from '@/lib/fetchJson';

// Open-Meteo forecast coverage: past_days max 92, forecast_days max 16 (today counts as day 0).
const MAX_PAST_DAYS = 92;
const MAX_FUTURE_DAYS = 16;
const DAY_MS = 24 * 60 * 60 * 1000;

interface ForecastResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

/**
 * Fetches the forecast for the trip date at the route's first point.
 * Returns null when the trip date is missing, invalid, or outside forecast coverage —
 * callers must treat that as "no weather", never as a reason to show today's weather.
 */
export async function fetchRouteWeather(lat: number, lng: number, tripDate?: string | null): Promise<string | null> {
  if (!tripDate || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const tripMs = Date.parse(tripDate);
  const todayMs = Date.parse(todayStr);
  if (Number.isNaN(tripMs) || Number.isNaN(todayMs)) return null;

  const offsetDays = Math.round((tripMs - todayMs) / DAY_MS);
  // Beyond Open-Meteo's forecast window (archive and far future have no forecast).
  if (offsetDays < -MAX_PAST_DAYS || offsetDays >= MAX_FUTURE_DAYS) return null;

  // One spare day on each side absorbs the browser-vs-location timezone edge (`timezone=auto`).
  const pastDays = Math.min(MAX_PAST_DAYS, Math.max(0, -offsetDays) + 1);
  const forecastDays = Math.min(MAX_FUTURE_DAYS, Math.max(0, offsetDays) + 2);

  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&past_days=${pastDays}&forecast_days=${forecastDays}`;
    const data = await fetchJson<ForecastResponse>(forecastUrl, { timeoutMs: 10000 });
    const daily = data.daily;
    const index: number = daily?.time?.indexOf(tripDate) ?? -1;
    if (index < 0) return null;

    const maxTemp = daily?.temperature_2m_max?.[index];
    const minTemp = daily?.temperature_2m_min?.[index];
    const weatherCode = daily?.weather_code?.[index];
    if (maxTemp == null || minTemp == null || weatherCode == null) return null;

    const condition = getWeatherCondition(weatherCode);
    // Stored as "min…max°C, <code>" — the UI turns the code into words via localizeWeather.
    return `${minTemp}…${maxTemp}°C, ${condition}`;
  } catch (err) {
    console.error('fetchRouteWeather error:', err);
    return null;
  }
}

type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm';

const WEATHER_CONDITIONS: WeatherCondition[] = ['clear', 'cloudy', 'rain', 'snow', 'fog', 'storm'];

// Rows written by earlier app versions store the Ukrainian wording; map it on read and leave the data untouched.
const LEGACY_CONDITIONS: Record<string, WeatherCondition> = {
  'ясно': 'clear',
  'хмарно': 'cloudy',
  'дощ': 'rain',
  'сніг': 'snow',
  'туман': 'fog',
  'гроза': 'storm',
  'злива': 'rain',
  'снігопад': 'snow',
};

function getWeatherCondition(code: number): WeatherCondition {
  if (code <= 3) return 'clear';
  if (code <= 48) return 'cloudy';
  if (code <= 57) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'storm';
}

/** Renders a stored weather string in the active language (condition code or legacy Ukrainian word). */
export function localizeWeather(weather: string, t: (key: string) => string): string {
  const separatorIndex = weather.lastIndexOf(', ');
  const raw = (separatorIndex === -1 ? weather : weather.slice(separatorIndex + 2)).trim().toLowerCase();
  const condition = WEATHER_CONDITIONS.includes(raw as WeatherCondition)
    ? (raw as WeatherCondition)
    : LEGACY_CONDITIONS[raw];
  if (!condition) return weather;
  return separatorIndex === -1
    ? t(`weather_${condition}`)
    : `${weather.slice(0, separatorIndex + 2)}${t(`weather_${condition}`)}`;
}
