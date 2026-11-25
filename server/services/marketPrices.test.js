const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RESOURCE_URL,
  buildAgmarknetParams,
  getAgmarknetPrices,
  normalizeAgmarknetRecord,
} = require("./marketPrices");

test("builds a bounded Agmarknet request with optional filters", () => {
  const params = buildAgmarknetParams({
    state: "Tamil Nadu",
    commodity: "Tomato",
    limit: "500",
    offset: "-1",
  }, "test-key");

  assert.equal(params["api-key"], "test-key");
  assert.equal(params["filters[state]"], "Tamil Nadu");
  assert.equal(params["filters[commodity]"], "Tomato");
  assert.equal(params.limit, "50");
  assert.equal(params.offset, "0");
});

test("normalizes official mandi records and keeps prices numeric", () => {
  const record = normalizeAgmarknetRecord({
    State: "Tamil Nadu",
    District: "Coimbatore",
    Market: "Mettupalayam",
    Commodity: "Tomato",
    Variety: "Local",
    Arrival_Date: "25/11/2026",
    Min_Price: "2,000",
    Max_Price: "3,500",
    Modal_Price: "2,750",
  });

  assert.equal(record.market, "Mettupalayam");
  assert.equal(record.arrivalDate, "25/11/2026");
  assert.equal(record.modalPrice, 2750);
  assert.equal(record.unit, "quintal");
});

test("requests market reports from the official API and rejects a missing key", async () => {
  const result = await getAgmarknetPrices(
    { state: "Tamil Nadu", commodity: `test-${Date.now()}` },
    {
      apiKey: "test-key",
      httpClient: {
        get: async (url, options) => {
          assert.equal(url, RESOURCE_URL);
          assert.equal(options.params["filters[state]"], "Tamil Nadu");
          return {
            data: {
              total: 1,
              records: [{
                state: "Tamil Nadu",
                district: "Coimbatore",
                market: "Mettupalayam",
                commodity: "Tomato",
                arrival_date: "25/11/2026",
                modal_price: "2750",
              }],
            },
          };
        },
      },
    }
  );
  assert.equal(result.status, "LIVE");
  assert.equal(result.records[0].modalPrice, 2750);

  await assert.rejects(
    getAgmarknetPrices({}, { apiKey: "" }),
    { code: "MARKET_API_NOT_CONFIGURED" }
  );
});
