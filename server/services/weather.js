const axios = require("axios");

const locations = {
  coimbatore: {
    name: "Coimbatore",
    country: "India",
    countryCode: "IN",
    latitude: 11.0168,
    longitude: 76.9558,
    fallback: { temperature: 31, humidity: 68, windSpeed: 3.2, precipitation: 0 },
  },
  gudalur: {
    name: "Gudalur",
    country: "India",
    countryCode: "IN",
    latitude: 11.503,
    longitude: 76.4917,
    fallback: { temperature: 23, humidity: 82, windSpeed: 1.5, precipitation: 0 },
  },
  pollachi: {
    name: "Pollachi",
    country: "India",
    countryCode: "IN",
    latitude: 10.6609,
    longitude: 77.0048,
    fallback: { temperature: 29, humidity: 72, windSpeed: 2.1, precipitation: 0 },
  },
};

const weatherCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getLocation(input) {
  if (input && typeof input === "object") {
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error("Weather coordinates must be valid latitude and longitude values.");
    }

    const preset = Object.values(locations).find((location) => (
      location.latitude === latitude && location.longitude === longitude
    ));
    return {
      ...preset,
      name: String(input.name || preset?.name || "Selected location").slice(0, 100),
      country: String(input.country || preset?.country || "").slice(0, 100),
      countryCode: String(input.countryCode || preset?.countryCode || "").slice(0, 2),
      latitude,
      longitude,
    };
  }

  const key = String(input || "Coimbatore").trim().toLowerCase();
  return locations[key] || locations.coimbatore;
}

function toWeatherResponse(location, values, source, updatedAt = null) {
  const isRaining = Number(values.precipitation) > 0;
  return {
    name: location.name,
    country: location.country || "",
    sys: { country: location.countryCode || "" },
    main: {
      temp: Number.isFinite(values.temperature) ? values.temperature : null,
      humidity: Number.isFinite(values.humidity) ? values.humidity : null,
    },
    wind: { speed: Number.isFinite(values.windSpeed) ? values.windSpeed : null },
    weather: [{
      description: Number.isFinite(values.temperature)
        ? (isRaining ? "rain" : "current conditions")
        : "live weather unavailable",
      icon: isRaining ? "10d" : "01d",
    }],
    current: {
      temperature_2m: Number.isFinite(values.temperature) ? values.temperature : null,
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

async function getCurrentWeather(input, httpClient = axios) {
  const location = getLocation(input);
  const cacheKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return toWeatherResponse(location, cached.values, "LIVE", cached.updatedAt);
  }

  try {
    const response = await httpClient.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
        wind_speed_unit: "ms",
      },
      timeout: 7000,
    });
    const current = response.data?.current;
    const readMetric = (value) => (value == null || value === "" ? NaN : Number(value));
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
    weatherCache.set(cacheKey, { values, updatedAt, fetchedAt: Date.now() });
    return toWeatherResponse(location, values, "LIVE", updatedAt);
  } catch (error) {
    console.warn("Open-Meteo unavailable; returning a marked fallback:", error.message);
    const fallback = cached?.values || location.fallback || {};
    return toWeatherResponse(location, fallback, "FALLBACK", cached?.updatedAt || null);
  }
}

module.exports = { getCurrentWeather };
