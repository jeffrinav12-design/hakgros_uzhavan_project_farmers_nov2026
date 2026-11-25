const presets = [
  {
    name: "Coimbatore",
    country: "India",
    countryCode: "IN",
    latitude: 11.0168,
    longitude: 76.9558,
    fallback: { temperature: 31, humidity: 68, windSpeed: 3.2, precipitation: 0 },
  },
  {
    name: "Gudalur",
    country: "India",
    countryCode: "IN",
    latitude: 11.503,
    longitude: 76.4917,
    fallback: { temperature: 23, humidity: 82, windSpeed: 1.5, precipitation: 0 },
  },
  {
    name: "Pollachi",
    country: "India",
    countryCode: "IN",
    latitude: 10.6609,
    longitude: 77.0048,
    fallback: { temperature: 29, humidity: 72, windSpeed: 2.1, precipitation: 0 },
  },
];

export const DEFAULT_WEATHER_LOCATION = presets[0];
export const WEATHER_PRESETS = presets.map(({ name, country, countryCode, latitude, longitude }) => ({
  name,
  country,
  countryCode,
  latitude,
  longitude,
}));

function resolveLocation(value) {
  if (typeof value === "string") {
    const match = presets.find((location) => location.name.toLowerCase() === value.trim().toLowerCase());
    return match || presets[0];
  }

  const latitude = Number(value?.latitude);
  const longitude = Number(value?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Choose a valid location before loading weather.");
  }

  const preset = presets.find((location) => (
    location.latitude === latitude && location.longitude === longitude
  ));
  return {
    ...preset,
    ...value,
    name: String(value.name || preset?.name || "Selected location"),
    country: String(value.country || preset?.country || ""),
    countryCode: String(value.countryCode || preset?.countryCode || ""),
    latitude,
    longitude,
  };
}

function normalizeWeather(location, values, source, updatedAt = null) {
  const hasMetrics = Number.isFinite(values.temperature);
  const isRaining = Number(values.precipitation) > 0;
  return {
    name: location.name,
    country: location.country || "",
    sys: { country: location.countryCode || "" },
    main: {
      temp: hasMetrics ? values.temperature : null,
      humidity: Number.isFinite(values.humidity) ? values.humidity : null,
    },
    wind: { speed: Number.isFinite(values.windSpeed) ? values.windSpeed : null },
    weather: [{
      description: hasMetrics ? (isRaining ? "rain" : "current conditions") : "live weather unavailable",
      icon: isRaining ? "10d" : "01d",
    }],
    current: {
      temperature_2m: hasMetrics ? values.temperature : null,
      relative_humidity_2m: Number.isFinite(values.humidity) ? values.humidity : null,
      wind_speed_10m: Number.isFinite(values.windSpeed) ? values.windSpeed : null,
      precipitation: Number.isFinite(values.precipitation) ? values.precipitation : null,
    },
    source,
    updatedAt,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function readMetric(value) {
  if (value == null || value === "") return NaN;
  return Number(value);
}

function cacheKey(location) {
  return `hakgros_weather_${location.latitude.toFixed(3)}_${location.longitude.toFixed(3)}`;
}

function readCachedWeather(location) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(location)) || "null");
    if (cached && Number.isFinite(cached.temperature)) return cached;
  } catch (error) {
    console.warn("Unable to read saved weather:", error.message);
  }
  return null;
}

export async function searchWeatherLocations(query) {
  const search = String(query || "").trim();
  if (search.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: search,
    count: "8",
    language: "en",
    format: "json",
  });
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Location search returned ${response.status}.`);
  const results = (await response.json()).results || [];
  return results
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item) => ({
      id: item.id,
      name: item.name,
      admin1: item.admin1 || "",
      country: item.country || "",
      countryCode: item.country_code || "",
      latitude: item.latitude,
      longitude: item.longitude,
    }));
}

export async function fetchRegionalWeather(locationInput) {
  const location = resolveLocation(locationInput);
  const key = cacheKey(location);

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
      wind_speed_unit: "ms",
    });
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
    const current = (await response.json()).current;
    const values = {
      temperature: readMetric(current?.temperature_2m),
      humidity: readMetric(current?.relative_humidity_2m),
      windSpeed: readMetric(current?.wind_speed_10m),
      precipitation: readMetric(current?.precipitation),
    };
    if (Object.values(values).some((value) => !Number.isFinite(value))) {
      throw new Error("Open-Meteo returned incomplete current conditions.");
    }

    const updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(key, JSON.stringify({ ...values, updatedAt }));
    } catch (error) {
      console.warn("Unable to save weather cache:", error.message);
    }
    return normalizeWeather(location, values, "LIVE", updatedAt);
  } catch (error) {
    console.warn("Open-Meteo unavailable; returning a marked fallback:", error.message);
    const cached = readCachedWeather(location);
    const values = cached || location.fallback || {};
    return normalizeWeather(location, values, "FALLBACK", cached?.updatedAt || null);
  }
}
