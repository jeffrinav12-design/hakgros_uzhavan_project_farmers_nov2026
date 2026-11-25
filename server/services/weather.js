const axios = require("axios");

const locations = {
  coimbatore: {
    name: "Coimbatore",
    latitude: 11.0168,
    longitude: 76.9558,
    fallback: { temperature: 31, humidity: 68, windSpeed: 3.2, precipitation: 0 },
  },
  gudalur: {
    name: "Gudalur",
    latitude: 11.503,
    longitude: 76.4917,
    fallback: { temperature: 23, humidity: 82, windSpeed: 1.5, precipitation: 0 },
  },
  pollachi: {
    name: "Pollachi",
    latitude: 10.6609,
    longitude: 77.0048,
    fallback: { temperature: 29, humidity: 72, windSpeed: 2.1, precipitation: 0 },
  },
};

function getLocation(city) {
  const key = String(city || "Coimbatore").trim().toLowerCase();
  return locations[key] || locations.coimbatore;
}

function toWeatherResponse(location, values, source) {
  const isRaining = values.precipitation > 0;
  return {
    name: location.name,
    sys: { country: "IN" },
    main: {
      temp: values.temperature,
      humidity: values.humidity,
    },
    wind: { speed: values.windSpeed },
    weather: [{
      description: isRaining ? "rain" : "current conditions",
      icon: isRaining ? "10d" : "01d",
    }],
    current: {
      temperature_2m: values.temperature,
      relative_humidity_2m: values.humidity,
      wind_speed_10m: values.windSpeed,
      precipitation: values.precipitation,
    },
    source,
    updatedAt: new Date().toISOString(),
  };
}

async function getCurrentWeather(city) {
  const location = getLocation(city);
  try {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
        wind_speed_unit: "ms",
      },
      timeout: 7000,
    });
    const current = response.data?.current;
    const values = {
      temperature: Number(current?.temperature_2m),
      humidity: Number(current?.relative_humidity_2m),
      windSpeed: Number(current?.wind_speed_10m),
      precipitation: Number(current?.precipitation),
    };
    if (Object.values(values).some((value) => !Number.isFinite(value))) {
      throw new Error("Open-Meteo returned incomplete current conditions.");
    }
    return toWeatherResponse(location, values, "LIVE");
  } catch (error) {
    console.warn("Open-Meteo unavailable; returning regional fallback:", error.message);
    return toWeatherResponse(location, location.fallback, "FALLBACK");
  }
}

module.exports = { getCurrentWeather };
