import { fetchRegionalWeather, searchWeatherLocations } from "./weather";

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
});

test("requests Open-Meteo with the selected Gudalur coordinates and normalizes metrics", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      current: {
        temperature_2m: 22.4,
        relative_humidity_2m: 81,
        wind_speed_10m: 1.7,
        precipitation: 0.2,
      },
    }),
  });

  const weather = await fetchRegionalWeather("Gudalur");

  expect(global.fetch.mock.calls[0][0]).toContain("latitude=11.503");
  expect(global.fetch.mock.calls[0][0]).toContain("longitude=76.4917");
  expect(weather.source).toBe("LIVE");
  expect(weather.current.precipitation).toBe(0.2);
  expect(weather.main.temp).toBe(22.4);
});

test("returns a marked regional fallback when Open-Meteo is unavailable", async () => {
  global.fetch.mockRejectedValue(new Error("offline"));

  const weather = await fetchRegionalWeather("Coimbatore");

  expect(weather.source).toBe("FALLBACK");
  expect(weather.name).toBe("Coimbatore");
  expect(Number.isFinite(weather.main.temp)).toBe(true);
});

test("supports live weather for geocoded locations outside the preset regions", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      current: {
        temperature_2m: 12.5,
        relative_humidity_2m: 71,
        wind_speed_10m: 2.4,
        precipitation: 0,
      },
    }),
  });

  const weather = await fetchRegionalWeather({
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
  });

  expect(global.fetch.mock.calls[0][0]).toContain("latitude=51.5072");
  expect(global.fetch.mock.calls[0][0]).toContain("longitude=-0.1276");
  expect(weather.source).toBe("LIVE");
  expect(weather.name).toBe("London");
  expect(weather.country).toBe("United Kingdom");
});

test("does not substitute Tamil Nadu weather for unknown locations when offline", async () => {
  global.fetch.mockRejectedValue(new Error("offline"));

  const weather = await fetchRegionalWeather({
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
  });

  expect(weather.source).toBe("FALLBACK");
  expect(weather.name).toBe("London");
  expect(weather.main.temp).toBeNull();
});

test("searches global cities through Open-Meteo geocoding", async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [{
        id: 1,
        name: "Singapore",
        latitude: 1.2897,
        longitude: 103.8501,
        country: "Singapore",
        country_code: "SG",
      }],
    }),
  });

  const results = await searchWeatherLocations("Singapore");

  expect(global.fetch.mock.calls[0][0]).toContain("name=Singapore");
  expect(results[0]).toMatchObject({
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
  });
});
