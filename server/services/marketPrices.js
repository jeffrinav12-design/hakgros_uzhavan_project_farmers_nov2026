const axios = require("axios");

const RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
const SOURCE_URL = "https://agmarknet.gov.in/";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_LIMIT = 50;
const responseCache = new Map();

function boundedInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(parsed, maximum));
}

function buildAgmarknetParams(filters, apiKey) {
  const limit = boundedInteger(filters.limit, MAX_LIMIT, MAX_LIMIT);
  const offset = boundedInteger(filters.offset, 0, 100000);
  const params = {
    "api-key": apiKey,
    format: "json",
    limit: String(limit || MAX_LIMIT),
    offset: String(offset),
    "sort[arrival_date]": "desc",
  };

  ["state", "district", "market", "commodity"].forEach((field) => {
    const value = String(filters[field] || "").trim().slice(0, 80);
    if (value) params[`filters[${field}]`] = value;
  });

  return params;
}

function readField(record, name) {
  const matchingKey = Object.keys(record).find((key) => key.toLowerCase() === name.toLowerCase());
  return matchingKey ? record[matchingKey] : undefined;
}

function parsePrice(value) {
  if (value == null || String(value).trim() === "") return null;
  const price = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(price) ? price : null;
}

function normalizeAgmarknetRecord(record) {
  const state = String(readField(record, "state") || "");
  const district = String(readField(record, "district") || "");
  const market = String(readField(record, "market") || "");
  const commodity = String(readField(record, "commodity") || "");
  const variety = String(readField(record, "variety") || "");
  const arrivalDate = String(readField(record, "arrival_date") || "");
  const id = [state, district, market, commodity, variety, arrivalDate].join("|");
  return {
    id,
    state,
    district,
    market,
    commodity,
    variety,
    arrivalDate,
    minPrice: parsePrice(readField(record, "min_price")),
    maxPrice: parsePrice(readField(record, "max_price")),
    modalPrice: parsePrice(readField(record, "modal_price")),
    unit: "quintal",
  };
}

async function getAgmarknetPrices(filters = {}, options = {}) {
  const apiKey = options.apiKey ?? process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    const error = new Error("Agmarknet is not configured. Add the free DATA_GOV_IN_API_KEY as a server-only Vercel environment variable.");
    error.code = "MARKET_API_NOT_CONFIGURED";
    throw error;
  }

  const params = buildAgmarknetParams(filters, apiKey);
  const cacheKey = JSON.stringify({ ...params, "api-key": undefined });
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  const httpClient = options.httpClient || axios;
  try {
    const response = await httpClient.get(RESOURCE_URL, { params, timeout: 10000 });
    const apiData = response.data;
    if (!Array.isArray(apiData?.records)) {
      throw new Error("Agmarknet returned an invalid response.");
    }

    const data = {
      records: apiData.records.map(normalizeAgmarknetRecord),
      total: apiData.total != null && Number.isFinite(Number(apiData.total)) ? Number(apiData.total) : null,
      source: "Agmarknet / data.gov.in",
      sourceUrl: SOURCE_URL,
      status: "LIVE",
      updatedAt: new Date().toISOString(),
    };
    responseCache.set(cacheKey, { data, checkedAt: Date.now() });
    return data;
  } catch (error) {
    if (cached) {
      return {
        ...cached.data,
        status: "FALLBACK",
        message: "Agmarknet is temporarily unavailable; showing previously fetched reports with their original arrival dates.",
        cached: true,
      };
    }
    throw error;
  }
}

module.exports = {
  MAX_LIMIT,
  RESOURCE_URL,
  buildAgmarknetParams,
  getAgmarknetPrices,
  normalizeAgmarknetRecord,
};
