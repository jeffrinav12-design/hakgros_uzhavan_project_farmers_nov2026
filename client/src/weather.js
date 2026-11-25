const locations = {
  Coimbatore: {
    latitude: 11.0168,
    longitude: 76.9558,
    fallback: { temperature: 31, humidity: 68, windSpeed: 3.2, precipitation: 0 },
  },
  Gudalur: {
    latitude: 11.503,
    longitude: 76.4917,
    fallback: { temperature: 23, humidity: 82, windSpeed: 1.5, precipitation: 0 },
  },
  Pollachi: {
    latitude: 10.6609,
    longitude: 77.0048,
    fallback: { temperature: 29, humidity: 72, windSpeed: 2.1, precipitation: 0 },
  },
};

const normalizeCity = (city) => {
  const key = String(city || "").trim().toLowerCase();
  return Object.keys(locations).find((name) => name.toLowerCase() === key) || "Coimbatore";
};

function normalizeWeather(city, values, source) {
  const isRaining = values.precipitation > 0;
  return {
    name: city,
    sys: { country: "IN" },
    main: { temp: values.temperature, humidity: values.humidity },
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

export async function fetchRegionalWeather(city) {
  const locationName = normalizeCity(city);
  const location = locations[locationName];
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
      temperature: Number(current?.temperature_2m),
      humidity: Number(current?.relative_humidity_2m),
      windSpeed: Number(current?.wind_speed_10m),
      precipitation: Number(current?.precipitation),
    };
    if (Object.values(values).some((value) => !Number.isFinite(value))) {
      throw new Error("Open-Meteo returned incomplete current conditions.");
    }
    return normalizeWeather(locationName, values, "LIVE");
  } catch (error) {
    console.warn("Open-Meteo unavailable; returning regional fallback:", error.message);
    return normalizeWeather(locationName, location.fallback, "FALLBACK");
  }
}
