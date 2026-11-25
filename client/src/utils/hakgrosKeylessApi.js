import { diagnoseCropStress } from "../cropDecisionEngine";
import { fetchRegionalWeather } from "../weather";

const regions = {
  gudalur: { city: "Gudalur", label: "Gudalur / Nilgiris" },
  coimbatore: { city: "Coimbatore", label: "Coimbatore Plains" },
  pollachi: { city: "Pollachi", label: "Pollachi / Anaimalai" },
};

const tamilLabels = {
  "Disease Name": "நோய்",
  Crop: "பயிர்",
  Confidence: "நம்பகத்தன்மை",
  Symptoms: "அறிகுறிகள்",
  "Possible Cause": "சாத்தியமான காரணம்",
  Treatment: "சிகிச்சை",
  Prevention: "தடுப்பு",
  Severity: "தீவிரம்",
};

export async function getKeylessMicroClimate(region = "gudalur") {
  const selectedRegion = regions[String(region).toLowerCase()] || regions.gudalur;
  const weather = await fetchRegionalWeather(selectedRegion.city);
  return {
    ...weather,
    status: weather.source,
    region: selectedRegion.label,
    temp: weather.main.temp,
    humidity: weather.main.humidity,
    wind: weather.wind.speed,
    rain: weather.current.precipitation,
  };
}

export function runKeylessBilingualAgriAI({ crop = "", symptom = "", temp, humidity }) {
  const startedAt = performance.now();
  const normalizedCrop = String(crop).split("/")[0].trim();
  const diagnosis = diagnoseCropStress({
    crop: normalizedCrop,
    symptoms: symptom,
    temperature: temp,
    humidity,
  });
  const english = [];
  const tamil = [];

  diagnosis.split("\n").forEach((line) => {
    const separator = line.indexOf(":");
    if (separator < 0) return;
    const label = line.slice(0, separator);
    const content = line.slice(separator + 1).trim();
    const bilingualSeparator = content.indexOf(" / ");
    const englishContent = bilingualSeparator < 0 ? content : content.slice(0, bilingualSeparator);
    const tamilContent = bilingualSeparator < 0 ? content : content.slice(bilingualSeparator + 3);
    english.push(`${label}: ${englishContent}`);
    tamil.push(`${tamilLabels[label] || label}: ${tamilContent}`);
  });

  return {
    engine: "Hakgros-AgriAI-Keyless",
    latencyMs: (performance.now() - startedAt).toFixed(2),
    severity: "UNCONFIRMED",
    en: english.join("\n"),
    ta: tamil.join("\n"),
    diagnosis,
  };
}

const LOGS_KEY = "hakgros_stratum_logs";

export function saveAgriTelemetryLog({ region, crop, symptom, weather, aiResult }) {
  const payload = { region, crop, symptom, weather, aiResult };
  const payloadKb = (new Blob([JSON.stringify(payload)]).size / 1024).toFixed(2);
  const receipt = {
    id: `HAKGROS-${Date.now()}`,
    timestamp: new Date().toLocaleString("en-IN"),
    tenant: "Hakgros_Uzhavan",
    payloadKb,
    storage: "LOCAL_DEVICE",
    cloudStatus: "FALLBACK",
    latencyMs: aiResult?.latencyMs || "N/A",
    crop,
    symptom,
    summaryEn: aiResult?.en || "",
    summaryTa: aiResult?.ta || "",
  };

  try {
    let history;
    try {
      const saved = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
      history = Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn("Unreadable local agriculture history; starting a fresh log:", error);
      history = [];
    }
    localStorage.setItem(LOGS_KEY, JSON.stringify([receipt, ...history].slice(0, 25)));
    receipt.persisted = true;
  } catch (error) {
    console.warn("Unable to persist the local agriculture receipt:", error);
    receipt.persisted = false;
  }

  return receipt;
}

export function getSavedAgriLogs() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Unable to read local agriculture history:", error);
    return [];
  }
}
