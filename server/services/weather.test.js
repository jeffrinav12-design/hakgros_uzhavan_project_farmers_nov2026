const test = require("node:test");
const assert = require("node:assert/strict");
const { getCurrentWeather } = require("./weather");

test("fetches current conditions for any valid coordinates", async () => {
  const weather = await getCurrentWeather({
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    latitude: 1.2897,
    longitude: 103.8501,
  }, {
    get: async (url, options) => {
      assert.equal(url, "https://api.open-meteo.com/v1/forecast");
      assert.equal(options.params.latitude, 1.2897);
      assert.equal(options.params.longitude, 103.8501);
      return {
        data: {
          current: {
            temperature_2m: 29,
            relative_humidity_2m: 80,
            wind_speed_10m: 1.8,
            precipitation: 0,
          },
        },
      };
    },
  });

  assert.equal(weather.source, "LIVE");
  assert.equal(weather.name, "Singapore");
  assert.equal(weather.country, "Singapore");
  assert.equal(weather.main.temp, 29);
});

test("does not use a Tamil Nadu fallback for other coordinates", async () => {
  const weather = await getCurrentWeather({
    name: "Reykjavik",
    country: "Iceland",
    latitude: 64.1466,
    longitude: -21.9426,
  }, {
    get: async () => { throw new Error("offline"); },
  });

  assert.equal(weather.source, "FALLBACK");
  assert.equal(weather.name, "Reykjavik");
  assert.equal(weather.main.temp, null);
});

test("rejects out-of-range coordinates", async () => {
  await assert.rejects(
    getCurrentWeather({ name: "Invalid", latitude: 100, longitude: 0 }),
    /valid latitude and longitude/
  );
});
