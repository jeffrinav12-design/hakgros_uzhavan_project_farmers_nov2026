import { fetchRegionalWeather } from "./weather";

beforeEach(() => {
  global.fetch = jest.fn();
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
