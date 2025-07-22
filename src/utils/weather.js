// utils/weather.js

// 地名→緯度経度
export async function fetchLatLon(place) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const res = await fetch(url, { headers: { "User-Agent": "reon-weather-demo/1.0" } });
  const arr = await res.json();
  if (arr.length === 0) throw new Error("地名が見つかりません");
  return { lat: arr[0].lat, lon: arr[0].lon };
}

// 緯度経度→天気
export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,weathercode&current_weather=true&timezone=Asia%2FTokyo`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("天気取得に失敗");
  return await res.json();
}

// コード→アイコン
export function codeToIcon(code) {
  if (code === 0) return "CLEAR_DAY";
  if ([1,2,3].includes(code)) return "PARTLY_CLOUDY_DAY";
  if ([45,48].includes(code)) return "CLOUDY";
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return "RAIN";
  if ([95,96,99].includes(code)) return "RAIN";
  return "CLOUDY";
}
