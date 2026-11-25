import {
  getKeylessMicroClimate,
  getSavedAgriLogs,
  runKeylessBilingualAgriAI,
  saveAgriTelemetryLog,
} from "./hakgrosKeylessApi";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      current: {
        temperature_2m: 28,
        relative_humidity_2m: 82,
        wind_speed_10m: 2,
        precipitation: 0,
      },
    }),
  });
});

test("provides keyless microclimate metrics for Pollachi", async () => {
  const weather = await getKeylessMicroClimate("pollachi");

  expect(global.fetch.mock.calls[0][0]).toContain("latitude=10.6609");
  expect(weather.status).toBe("LIVE");
  expect(weather.region).toBe("Pollachi / Anaimalai");
  expect(weather.temp).toBe(28);
});

test("returns cautious bilingual crop guidance and local-only receipt", () => {
  const aiResult = runKeylessBilingualAgriAI({
    crop: "Tea / தேயிலை",
    symptom: "yellow leaves and rust spots",
    temp: 29,
    humidity: 82,
  });
  const receipt = saveAgriTelemetryLog({
    region: "gudalur",
    crop: "Tea",
    symptom: "yellow leaves and rust spots",
    weather: { temp: 29, humidity: 82 },
    aiResult,
  });

  expect(aiResult.en).toContain("Disease Name");
  expect(aiResult.ta).toContain("நோய்");
  expect(aiResult.severity).toBe("UNCONFIRMED");
  expect(receipt.storage).toBe("LOCAL_DEVICE");
  expect(receipt.cloudStatus).toBe("FALLBACK");
  expect(getSavedAgriLogs()).toHaveLength(1);
});
