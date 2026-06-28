export async function fetchRouteWeather(lat: number, lng: number, tripDate?: string): Promise<string | null> {
  try {
    // Use the coordinates directly for forecast since we already have lat/lng
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=7`;
    const res = await fetch(forecastUrl);
    const data = await res.json();
    if (!data.current) return null;
    const temp = data.current.temperature_2m;
    const weatherCode = data.current.weather_code;
    const condition = getWeatherCondition(weatherCode);
    return `${temp}°C, ${condition}`;
  } catch {
    return null;
  }
}

function getWeatherCondition(code: number): string {
  if (code <= 3) return 'ясно';
  if (code <= 48) return 'хмарно';
  if (code <= 57) return 'туман';
  if (code <= 67) return 'дощ';
  if (code <= 77) return 'сніг';
  if (code <= 82) return 'злива';
  if (code <= 86) return 'снігопад';
  return 'гроза';
}
