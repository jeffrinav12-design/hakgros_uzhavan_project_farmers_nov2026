# HAKGROS UZHAVAN

## API integrations and deployment

- Weather uses the keyless Open-Meteo current-conditions API for Coimbatore, Gudalur, and Pollachi. If the service or backend is unreachable, the app uses clearly marked regional fallback values.
- AI requests run through the server. Configure `GEMINI_API_KEY` (or the server-side `REACT_APP_GEMINI_API_KEY` / `VITE_GEMINI_API_KEY`) and optionally `GEMINI_MODEL`. Do not expose AI secrets in browser code or public client build settings. Gemini failures fall back to the bilingual symptom-based crop decision engine.
- The frontend is Create React App: set `REACT_APP_API_BASE` only when the API is hosted on a different origin. Same-origin Vercel deployments need no API base. Local frontend development proxies `/api` to `http://localhost:5000`.
- Telemetry is queued in browser `localStorage` until the backend accepts it. Configure `STRATUM_TELEMETRY_PRIMARY_URL` and `STRATUM_TELEMETRY_SECONDARY_URL` (optionally `STRATUM_TELEMETRY_TOKEN`) for the dual-node Stratum REST adapter. The adapter can write to Neon PostgreSQL or another backend. Alternatively configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_TELEMETRY_TABLE` (default `telemetry_events`) for Supabase REST. The Supabase table should contain `event_name`, `status`, `source`, and `occurred_at` columns. Server-only credentials must never use a `REACT_APP_` or `VITE_` prefix.
- `client/src/utils/hakgrosKeylessApi.js` exposes the keyless weather and bilingual engine helpers. Its detailed agriculture receipts are device-local and explicitly report `FALLBACK`; a displayed node name is not proof of cloud persistence.

Telemetry reports `LIVE` only after a remote write succeeds; otherwise queued events remain on the device and integrations display `FALLBACK`.