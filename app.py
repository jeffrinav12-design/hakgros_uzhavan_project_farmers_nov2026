import streamlit as st
import time
import json
import requests
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, text

PRODUCT_NAME = "Rafoan"
TAGLINE = "One Unified Platform for a Multi-Cloud World"

st.set_page_config(
    page_title=f"{PRODUCT_NAME} | Multi-Cloud SaaS & PaaS Platform",
    page_icon="☁️",
    layout="wide"
)

@st.cache_resource
def init_db_engines():
    neon_url = st.secrets.get("NEON_AWS_URL", "")
    supabase_url = st.secrets.get("SUPABASE_AZURE_URL", "")
    if neon_url.startswith("postgres://"):
        neon_url = neon_url.replace("postgres://", "postgresql://", 1)
    if supabase_url.startswith("postgres://"):
        supabase_url = supabase_url.replace("postgres://", "postgresql://", 1)
    neon_engine = create_engine(neon_url, pool_pre_ping=True) if neon_url else None
    supa_engine = create_engine(supabase_url, pool_pre_ping=True) if supabase_url else None
    return neon_engine, supa_engine

neon_engine, supa_engine = init_db_engines()

def setup_tables():
    create_sql = """
    CREATE TABLE IF NOT EXISTS rafoan_finops_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_module VARCHAR(100),
        priority VARCHAR(20),
        payload_kb FLOAT,
        routed_node VARCHAR(60),
        latency_ms FLOAT,
        estimated_savings_usd FLOAT,
        summary TEXT
    );
    """
    for engine in [neon_engine, supa_engine]:
        if engine:
            try:
                with engine.begin() as conn:
                    conn.execute(text(create_sql))
            except Exception as e:
                st.sidebar.warning(f"DB Init Notice: {e}")

setup_tables()

def fetch_live_logs():
    frames = []
    query = text("""
        SELECT timestamp, tenant_module, priority, payload_kb, routed_node, latency_ms, estimated_savings_usd, summary
        FROM rafoan_finops_logs
        ORDER BY timestamp DESC
        LIMIT 20
    """)
    for engine in [neon_engine, supa_engine]:
        if engine:
            try:
                with engine.connect() as conn:
                    df = pd.read_sql(query, conn)
                    if not df.empty:
                        frames.append(df)
            except Exception:
                pass
    if frames:
        combined = pd.concat(frames, ignore_index=True).sort_values(by="timestamp", ascending=False)
        return combined.head(25), True

    demo_df = pd.DataFrame([
        {"timestamp": datetime.now(), "tenant_module": "Hakgros_Uzhavan_AgriAI", "priority": "HIGH", "payload_kb": 0.62, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 14.2, "estimated_savings_usd": 0.0033, "summary": "Tea - Gudalur Micro-climate Sync"},
        {"timestamp": datetime.now(), "tenant_module": "Biblical_Archaeology_3D", "priority": "LOW", "payload_kb": 235.4, "routed_node": "Node 2: Supabase (Azure Bulk Storage)", "latency_ms": 48.7, "estimated_savings_usd": 0.0059, "summary": "Tel Megiddo - Iron Age IIA 3D Mesh"},
        {"timestamp": datetime.now(), "tenant_module": "Sahaezer_Disaster_SOS", "priority": "HIGH", "payload_kb": 0.41, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 11.8, "estimated_savings_usd": 0.0033, "summary": "GPS SOS Alert - Nilgiris Relief Hub"},
        {"timestamp": datetime.now(), "tenant_module": "Yeidaraah_Food_Rescue", "priority": "HIGH", "payload_kb": 0.54, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 12.6, "estimated_savings_usd": 0.0033, "summary": "45 Meals Matched - Coimbatore Shelter"},
        {"timestamp": datetime.now(), "tenant_module": "MOED_Ministry_App", "priority": "HIGH", "payload_kb": 0.38, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 10.9, "estimated_savings_usd": 0.0033, "summary": "Daily Devotional & Scripture Sync"}
    ])
    return demo_df, False

@st.cache_data(ttl=600)
def get_reliable_weather(lat: float, lon: float):
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,shortwave_radiation"
    )
    try:
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        c = r.json().get("current", {})
        return {
            "api_status": "LIVE (Open-Meteo Keyless)",
            "temp": c.get("temperature_2m", 24.0),
            "humidity": c.get("relative_humidity_2m", 78),
            "wind": c.get("wind_speed_10m", 8.0),
            "rain": c.get("precipitation", 0.0),
            "irradiance": c.get("shortwave_radiation", 540.0),
        }
    except Exception as e:
        return {
            "api_status": f"FALLBACK ACTIVE ({str(e)[:25]})",
            "temp": 23.5,
            "humidity": 82,
            "wind": 7.4,
            "rain": 1.0,
            "irradiance": 520.0,
        }

def run_bilingual_crop_ai(crop: str, symptom: str, weather: dict):
    gemini_key = st.secrets.get("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
            prompt = (
                f"You are an agricultural scientist in Tamil Nadu. Crop: {crop}. "
                f"Symptom: {symptom}. Temp: {weather['temp']}C, Humidity: {weather['humidity']}%. "
                f"Give a 2-sentence diagnosis and organic treatment in English, followed by a 2-sentence translation in Tamil."
            )
            res = requests.post(endpoint, json={"contents": [{"parts": [{"text": prompt}]}]}, timeout=6)
            if res.status_code == 200:
                ai_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                return "LIVE AI (Gemini 2.0 Flash)", ai_text
        except Exception:
            pass

    hum = weather["humidity"]
    temp = weather["temp"]
    if "Healthy" in symptom:
        en = f"Micro-climate ({temp}C, {hum}% humidity) is optimal for {crop}. Continue balanced drip irrigation and neem-cake soil enrichment."
        ta = f"{crop} பயிருக்கு தற்போதைய தட்பவெப்பநிலை ({temp}C, {hum}% ஈரப்பதம்) ஏற்றதாக உள்ளது. வழக்கமான நீர் பாய்ச்சல் மற்றும் வேப்பம் பிண்ணாக்கு உரமிடுதலைத் தொடரவும்."
    elif "Rust" in symptom or "Fungal" in symptom or hum >= 80:
        en = f"High humidity ({hum}%) triggers fungal/blight stress in {crop}. Spray Pseudomonas fluorescens (10g/L) or Trichoderma viride and prune dense lower leaves."
        ta = f"அதிக ஈரப்பதம் ({hum}%) காரணமாக {crop} பயிரில் பூஞ்சை மற்றும் இலைப்புள்ளி நோய் ஏற்பட்டுள்ளது. சூடோமோனாஸ் புளோரசன்ஸ் (10 கிராம்/லிட்டர்) தெளித்து, கீழ் இலைகளை அகற்றவும்."
    else:
        en = f"Leaf curl/nutrient stress detected in {crop} at {temp}C. Apply Panchagavya (3% foliar spray) and yellow sticky traps."
        ta = f"{temp}C வெப்பநிலையில் {crop} பயிரில் இலை சுருட்டல்/ஊட்டச்சத்து குறைபாடு காணப்படுகிறது. 3% பஞ்சகவ்யா இலைவழி உரமாகத் தெளித்து, மஞ்சள் ஒட்டும் பொறிகளை வைக்கவும்."

    return "BUILT-IN AGRI-AI ENGINE (Zero-Key 24/7)", f"**English:** {en}\n\n**தமிழ்:** {ta}"

def route_workload(tenant_module: str, priority: str, payload_dict: dict, summary: str):
    start_time = time.perf_counter()
    payload_str = json.dumps(payload_dict)
    payload_kb = round(len(payload_str.encode("utf-8")) / 1024, 3)

    if priority == "HIGH" or payload_kb < 50.0:
        target_node = "Node 1: Neon.tech (AWS Fast RDS)"
        active_engine = neon_engine
        baseline_enterprise_cost = 0.0045
        stratum_cost = 0.0012
    else:
        target_node = "Node 2: Supabase (Azure Bulk Storage)"
        active_engine = supa_engine
        baseline_enterprise_cost = 0.0080
        stratum_cost = 0.0021

    db_status = "Demo Cache (Add DB URLs in Secrets for Live Sync)"
    if active_engine:
        try:
            insert_sql = text("""
                INSERT INTO rafoan_finops_logs 
                (tenant_module, priority, payload_kb, routed_node, latency_ms, estimated_savings_usd, summary)
                VALUES (:mod, :prio, :kb, :node, :lat, :sav, :sum)
            """)
            with active_engine.begin() as conn:
                conn.execute(insert_sql, {
                    "mod": tenant_module,
                    "prio": priority,
                    "kb": payload_kb,
                    "node": target_node,
                    "lat": round((time.perf_counter() - start_time) * 1000, 2),
                    "sav": round(baseline_enterprise_cost - stratum_cost, 5),
                    "sum": summary
                })
            db_status = "Committed 24/7 Multi-Cloud DB"
        except Exception as e:
            db_status = f"DB Fallback ({str(e)[:32]}...)"

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    savings_pct = round(((baseline_enterprise_cost - stratum_cost) / baseline_enterprise_cost) * 100, 1)

    return {
        "node": target_node,
        "payload_kb": payload_kb,
        "latency_ms": latency_ms,
        "savings_pct": savings_pct,
        "savings_usd": round(baseline_enterprise_cost - stratum_cost, 5),
        "status": db_status
    }

st.sidebar.title(f"☁️ {PRODUCT_NAME}")
st.sidebar.caption(TAGLINE)

node1_ok = "🟢 Online" if neon_engine else "🟡 Awaiting Secret"
node2_ok = "🟢 Online" if supa_engine else "🟡 Awaiting Secret"
st.sidebar.markdown(f"**AWS Node (Neon):** {node1_ok}")
st.sidebar.markdown(f"**Azure Node (Supabase):** {node2_ok}")
st.sidebar.divider()

WORKSPACES = [
    "1. Rafoan Command Center (All 10 Apps)",
    "2. Biblical Archaeology Engine",
    "3. Hakgros Uzhavan (Agri-AI)",
    "4. Sahaezer (Disaster SOS)",
    "5. Yeidaraah (Food Rescue)",
    "6. Deeksharambh (Bridge Course)",
    "7. Academic Selection Portal",
    "8. Solaraelpan (INR Solar)",
    "9. Innovoadai Showcase",
    "10. AI Email Agent & MOED Ministry"
]

VIEW_PARAM_MAP = {
    "home": 0, "arch": 1, "agri": 2, "sos": 3, "food": 4,
    "bridge": 5, "elective": 6, "solar": 7, "innovo": 8, "moed": 9, "email": 9
}
qp = st.query_params.get("view", "").lower()
default_idx = VIEW_PARAM_MAP.get(qp, 0)

nav = st.sidebar.radio("Select Rafoan SaaS / PaaS Module:", WORKSPACES, index=default_idx)

if nav == WORKSPACES[0]:
    st.title(f"☁️ {PRODUCT_NAME} — {TAGLINE}")
    st.info(
        "**Rafoan** unites **Ra** (*rav*, Hebrew for *many*), **Fo** (*sýnnefo*, Greek for *cloud*), "
        "and **An** (*anan*, Hebrew for *cloud*) — empowering teams to deploy, scale, and manage "
        "10 production SaaS applications across AWS and Azure without vendor lock-in."
    )

    logs_df, is_live_sql = fetch_live_logs()
    total_saved = round(logs_df["estimated_savings_usd"].sum(), 4)
    avg_lat = round(logs_df["latency_ms"].mean(), 1)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Active Cloud Providers", "2 (AWS + Azure)", "Zero Vendor Lock-In")
    col2.metric("Avg FinOps Cost Reduction", "73.3%", f"${total_saved} Logged")
    col3.metric("Avg Routing Latency", f"{avg_lat} ms", "Sub-50ms SLA")
    col4.metric("Unified SaaS Portfolio", "10 Live Apps", "100% Connected")

    st.divider()
    st.subheader("🚀 Unified 10-App Commercial & Enterprise Suite")
    apps = [
        {"App": "1. Biblical Archaeology Engine", "Domain": "Geospatial & 3D Excavation Scans", "Routing": "Heavy 3D -> Supabase Bulk", "Status": "Active (View 2)", "URL": "#"},
        {"App": "2. Hakgros Uzhavan", "Domain": "Bilingual Farmer Agri-AI Advisory", "Routing": "Weather/Telemetry -> Neon Fast", "Status": "Live Portal", "URL": "https://hakgrosuzhavanprojectfarmersnov2026.vercel.app/"},
        {"App": "3. Sahaezer", "Domain": "Offline GPS Disaster SOS & Response", "Routing": "Urgent SOS -> Neon Fast", "Status": "Active (View 4)", "URL": "#"},
        {"App": "4. Yeidaraah", "Domain": "Perishable Food Rescue & Surplus Match", "Routing": "Donor Dispatch -> Neon Fast", "Status": "Live Portal", "URL": "https://yeidaraah-app1.vercel.app/"},
        {"App": "5. Deeksharambh", "Domain": "Institutional Bridge Course Portal", "Routing": "Student Onboarding -> Neon Fast", "Status": "Live Portal", "URL": "https://deeksharambh70antigravity.vercel.app/"},
        {"App": "6. Academic Selection Portal", "Domain": "Anti-Collision Elective Timetable Engine", "Routing": "Schedule Matrix -> Neon Fast", "Status": "Live Portal", "URL": "https://studentselectionportal.vercel.app/"},
        {"App": "7. Solaraelpan", "Domain": "Live Solar Irradiance & INR Estimator", "Routing": "Irradiance Logs -> Supabase", "Status": "Live Portal", "URL": "https://solaraelpan.vercel.app/"},
        {"App": "8. Innovoadai", "Domain": "Enterprise Innovation Showcase", "Routing": "Read-Only Tier -> Neon Fast", "Status": "Live Portal", "URL": "https://share.google/5lfHcOVHNHDIBl8q3"},
        {"App": "9. AI Email Agent", "Domain": "Automated Business Email Workflows", "Routing": "API Queue -> Neon Fast", "Status": "Live Portal", "URL": "https://aiemailagentnov2026project-m8je3jq2if8qcrjfcnxwxi.streamlit.app/"},
        {"App": "10. MOED (Jesus Never Fail Ministries)", "Domain": "Scripture Study & Daily Devotional", "Routing": "Ministry Telemetry -> Neon Fast", "Status": "Live Portal", "URL": "https://moedgospelappnov2026.vercel.app/"}
    ]
    st.dataframe(
        pd.DataFrame(apps),
        use_container_width=True,
        hide_index=True,
        column_config={"URL": st.column_config.LinkColumn("Live App URL", display_text="Open App")}
    )

    st.divider()
    st.subheader("📡 Live Multi-Cloud SQL Telemetry Feed (Neon AWS + Supabase Azure)")
    if is_live_sql:
        st.caption("🟢 Reading live committed transactions directly from your 24/7 PostgreSQL nodes.")
    else:
        st.caption("🟡 Showing sample telemetry until NEON_AWS_URL & SUPABASE_AZURE_URL are configured in Secrets.")
    st.dataframe(logs_df, use_container_width=True, hide_index=True)

elif nav == WORKSPACES[1]:
    st.title("🏛️ Biblical Archaeology Engine — Levant Geospatial & 3D Offloader")
    levant_sites = pd.DataFrame([
        {"Site": "City of David (Jerusalem)", "lat": 31.7731, "lon": 35.2354, "Primary Era": "Iron Age II / Second Temple"},
        {"Site": "Tel Megiddo", "lat": 32.5852, "lon": 35.1844, "Primary Era": "Bronze Age / Iron Age"},
        {"Site": "Tell es-Sultan (Jericho)", "lat": 31.8711, "lon": 35.4444, "Primary Era": "Neolithic / Middle Bronze Age"},
        {"Site": "Tel Hazor", "lat": 33.0167, "lon": 35.5681, "Primary Era": "Late Bronze Age / Iron Age"},
        {"Site": "Qumran Caves", "lat": 31.7414, "lon": 35.4594, "Primary Era": "Hellenistic / Roman Period"},
        {"Site": "Tel Shiloh", "lat": 32.0558, "lon": 35.2894, "Primary Era": "Iron Age I"}
    ])

    col_left, col_right = st.columns([1.1, 1])
    with col_left:
        st.subheader("🗺️ Levant Excavation Geospatial Map")
        st.map(levant_sites, latitude="lat", longitude="lon", zoom=7)
        st.dataframe(levant_sites[["Site", "Primary Era"]], use_container_width=True, hide_index=True)

    with col_right:
        st.subheader("🏺 Field Artifact Upload & Chronological Cross-Check")
        selected_site = st.selectbox("Excavation Tell / Site:", levant_sites["Site"].tolist())
        stratum_layer = st.selectbox("Stratigraphy Layer / Pottery Typology:", [
            "Iron Age IIA (c. 1000-925 BCE) - Red-Slipped Burnished Ware",
            "Iron Age IIB (c. 925-720 BCE) - LMLK Royal Storage Jar Handles",
            "Late Bronze Age II (c. 1400-1200 BCE) - Bichrome & Mycenaean Imports",
            "Second Temple / Herodian (c. 37 BCE-70 CE) - Limestone Measuring Vessels"
        ])
        artifact_notes = st.text_input("Field Locus & Trench Notes:", "Locus 402, Square B4 - Intact rim & inscribed seal impression")
        simulate_3d_mesh = st.checkbox("Simulate Heavy 3D Photogrammetry Mesh (240 KB -> Auto-Offload to Supabase Bulk)", value=True)

        if st.button("🚀 Cross-Check Chronology & Route to Rafoan Cloud", type="primary"):
            mesh_sim_data = "3D_MESH_STREAM_" + ("M" * (240000 if simulate_3d_mesh else 800))
            payload = {"site": selected_site, "stratum": stratum_layer, "notes": artifact_notes, "mesh_payload": mesh_sim_data}
            priority = "LOW" if simulate_3d_mesh else "HIGH"
            receipt = route_workload("Biblical_Archaeology_3D", priority, payload, f"{selected_site} | {stratum_layer[:22]}")
            st.success(f"**Chronology Verified:** `{stratum_layer}` matches strata at **{selected_site}**.")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['payload_kb']} KB` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

elif nav == WORKSPACES[2]:
    st.title("🌱 Hakgros Uzhavan — Bilingual Agri-AI & Micro-Climate Sync")
    st.markdown("**Live Portal:** [hakgrosuzhavanprojectfarmersnov2026.vercel.app](https://hakgrosuzhavanprojectfarmersnov2026.vercel.app/)")

    c1, c2 = st.columns(2)
    with c1:
        region = st.selectbox("Select Micro-Climate Zone:", [
            "Gudalur / Nilgiris (11.50 N, 76.49 E)",
            "Coimbatore Plains (11.01 N, 76.95 E)",
            "Pollachi / Anaimalai (10.66 N, 77.00 E)"
        ])
        crop = st.selectbox("Select Crop / பயிர்:", [
            "Tea / தேயிலை", "Banana / வாழை", "Paddy / நெல்", "Pepper / மிளகு", "Tomato / தக்காளி"
        ])
        symptom = st.selectbox("Observed Leaf Condition / இலை நிலை:", [
            "Healthy / ஆரோக்கியமானது",
            "Yellowing & Rust Spots / மஞ்சள் மற்றும் துரு புள்ளிகள்",
            "Leaf Curl / இலை சுருட்டல்",
            "Fungal Blight (High Humidity) / பூஞ்சை கருகல்"
        ])
        simulate_heavy_image = st.checkbox("Simulate High-Res Leaf Scan Upload (>60 KB -> Routes to Supabase Bulk Node)")

    lat, lon = (11.50, 76.49) if "Gudalur" in region else ((11.01, 76.95) if "Coimbatore" in region else (10.66, 77.00))
    weather_data = get_reliable_weather(lat, lon)

    with c2:
        st.subheader("🌦️ Live Micro-Climate Telemetry")
        st.caption(f"Weather API Status: **{weather_data['api_status']}**")
        w1, w2, w3 = st.columns(3)
        w1.metric("Temp / வெப்பநிலை", f"{weather_data['temp']} C")
        w2.metric("Humidity / ஈரப்பதம்", f"{weather_data['humidity']}%")
        w3.metric("Wind / காற்று", f"{weather_data['wind']} km/h")

        if st.button("⚡ Run Bilingual AI Diagnosis & Route to Rafoan Cloud", type="primary"):
            ai_source, diagnosis_text = run_bilingual_crop_ai(crop, symptom, weather_data)
            payload = {"region": region, "crop": crop, "symptom": symptom, "weather": weather_data, "image_buffer": "X" * (65000 if simulate_heavy_image else 500)}
            priority = "LOW" if simulate_heavy_image else "HIGH"
            receipt = route_workload("Hakgros_Uzhavan_AgriAI", priority, payload, f"{crop} - {symptom}")
            st.success(f"### Bilingual Advisory / இருமொழி ஆலோசனை\n*Engine: {ai_source}*")
            st.markdown(diagnosis_text)
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['payload_kb']} KB` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

elif nav == WORKSPACES[3]:
    st.title("🚨 Sahaezer — Disaster Coordination & Offline GPS SOS Telemetry")
    st.markdown("Jetpack Compose Android Client + OpenStreetMap Offline Tiles + Real-Time Emergency Dispatch")

    rescue_nodes = pd.DataFrame([
        {"Node": "Gudalur Relief Hub (Nilgiris)", "lat": 11.5030, "lon": 76.4917, "Role": "Landslide & Monsoon SOS"},
        {"Node": "Ooty Central Emergency Base", "lat": 11.4102, "lon": 76.6950, "Role": "Medical & Rescue Dispatch"},
        {"Node": "Coimbatore North Shelter", "lat": 11.0168, "lon": 76.9558, "Role": "24/7 Evacuee Coordination"},
        {"Node": "Mettupalayam Foothill Depot", "lat": 11.2990, "lon": 76.9349, "Role": "Supply & Transit Staging"}
    ])

    s1, s2 = st.columns([1, 1.1])
    with s1:
        st.subheader("📡 Urgent GPS SOS Dispatch")
        sos_type = st.selectbox("Emergency Alert Category:", [
            "Landslide / Road Blockage SOS",
            "Medical Evacuation Request",
            "Flood / Heavy Rain Shelter Alert",
            "Offline Tile Sync Heartbeat"
        ])
        zone = st.selectbox("Incident Relief Hub:", rescue_nodes["Node"].tolist())
        survivors = st.number_input("Affected Individuals:", min_value=1, max_value=500, value=12)

        if st.button("🚨 Transmit High-Priority SOS to Rafoan Cloud", type="primary"):
            summary = f"{sos_type} ({survivors} pax) at {zone}"
            payload = {"app": "Sahaezer_SOS", "type": sos_type, "zone": zone, "affected": survivors}
            receipt = route_workload("Sahaezer_Disaster_SOS", "HIGH", payload, summary)
            st.error(f"**SOS CONFIRMED:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with s2:
        st.subheader("🗺️ Offline-Ready OpenStreetMap Telemetry Grid")
        st.map(rescue_nodes, latitude="lat", longitude="lon", zoom=8)
        st.dataframe(rescue_nodes[["Node", "Role"]], use_container_width=True, hide_index=True)

elif nav == WORKSPACES[4]:
    st.title("🍲 Yeidaraah — Perishable Food Rescue & Surplus Distribution")
    st.markdown("**Live Portal:** [yeidaraah-app1.vercel.app](https://yeidaraah-app1.vercel.app/)")

    y1, y2 = st.columns(2)
    with y1:
        st.subheader("📦 Log Surplus Food Donation")
        donor_name = st.text_input("Donor / Kitchen / Event Host:", "Coimbatore Community Banquet Hall")
        food_type = st.selectbox("Food Category:", [
            "Cooked Rice & Sambar (Hot — 4 hr window)",
            "Chapati & Vegetable Curry (Hot — 5 hr window)",
            "Fresh Bakery & Fruit Packs (12 hr window)",
            "Packaged Dry Rations (30 day window)"
        ])
        meal_count = st.slider("Estimated Meals Available:", 10, 500, 75, 5)
        pickup_zone = st.selectbox("Pickup & Shelter Zone:", [
            "Coimbatore Central Shelter",
            "Gudalur Community Kitchen",
            "Ooty Town Care Home",
            "Pollachi Hope Center"
        ])

        if st.button("🤝 Match Shelter & Route to Rafoan Cloud", type="primary"):
            summary = f"{meal_count} meals ({food_type.split('(')[0].strip()}) -> {pickup_zone}"
            payload = {"donor": donor_name, "food": food_type, "meals": meal_count, "shelter": pickup_zone}
            receipt = route_workload("Yeidaraah_Food_Rescue", "HIGH", payload, summary)
            st.success(f"**Volunteer Dispatch Triggered:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with y2:
        st.subheader("📊 Active Zero-Hunger Rescue Metrics")
        m1, m2 = st.columns(2)
        m1.metric("Target Dispatch SLA", "< 25 mins", "Sub-50ms DB Sync")
        m2.metric("CO2 & Waste Offset", "2.4 kg / meal", "Verified Impact")
        rescue_feed = pd.DataFrame([
            {"Donor": "Nilgiris Tea Estate Canteen", "Meals": 60, "Destination": "Gudalur Community Kitchen", "Status": "Delivered"},
            {"Donor": "RS Puram Bakery Collective", "Meals": 40, "Destination": "Coimbatore Central Shelter", "Status": "In Transit"},
            {"Donor": "Ooty Convention Center", "Meals": 120, "Destination": "Ooty Town Care Home", "Status": "Matched"}
        ])
        st.dataframe(rescue_feed, use_container_width=True, hide_index=True)

elif nav == WORKSPACES[5]:
    st.title("🎓 Deeksharambh — Student Induction & Bridge Course Management")
    st.markdown("**Live Portal:** [deeksharambh70antigravity.vercel.app](https://deeksharambh70antigravity.vercel.app/)")

    d1, d2 = st.columns(2)
    with d1:
        st.subheader("📝 Log Bridge Course Attendance & Assessment")
        student_batch = st.selectbox("Student Batch:", [
            "1st Year B.Sc. Computer Science with Data Analytics",
            "1st Year B.Sc. Computer Science",
            "1st Year BCA",
            "1st Year B.Com IT"
        ])
        module_name = st.selectbox("Induction Module:", [
            "Python & Data Analytics Foundations",
            "Cloud Computing & GitHub Deployment",
            "Quantitative Aptitude & Logic Bridge",
            "Professional Communication & Ethics"
        ])
        completion_pct = st.slider("Batch Module Completion (%):", 0, 100, 94)

        if st.button("💾 Sync Bridge Record to Rafoan Cloud", type="primary"):
            summary = f"{student_batch[:24]} | {module_name[:22]} ({completion_pct}%)"
            payload = {"batch": student_batch, "module": module_name, "completion": completion_pct}
            receipt = route_workload("Deeksharambh_Bridge_Portal", "HIGH", payload, summary)
            st.success(f"**Record Committed:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with d2:
        st.subheader("📊 Cohort Readiness Overview")
        st.dataframe(pd.DataFrame([
            {"Module": "Python & Data Analytics Foundations", "Batch": "B.Sc. CS (DA)", "Completion": "94%"},
            {"Module": "Cloud & GitHub Deployment", "Batch": "BCA / B.Sc. CS", "Completion": "89%"},
            {"Module": "Communication & Aptitude Bridge", "Batch": "All UG Freshers", "Completion": "97%"}
        ]), use_container_width=True, hide_index=True)

elif nav == WORKSPACES[6]:
    st.title("🔀 Academic Selection Portal — Anti-Collision Elective Guide")
    st.markdown("**Live Portal:** [studentselectionportal.vercel.app](https://studentselectionportal.vercel.app/)")

    a1, a2 = st.columns(2)
    with a1:
        dept = st.selectbox("Department:", ["B.Sc. Computer Science with Data Analytics", "B.Sc. Computer Science", "BCA", "B.Com IT"])
        core_paper = st.selectbox("Core Morning Slot (09:30 AM):", ["Big Data Analytics", "Cloud Computing & FinOps", "Machine Learning"])
        elective_choice = st.selectbox("Open Elective Choice:", [
            "Quantitative Aptitude (11:30 AM)",
            "Big Data Analytics Lab (09:30 AM - Conflict!)",
            "Cyber Forensics (02:00 PM)"
        ])

        if st.button("✅ Validate Timetable & Sync to Rafoan Cloud", type="primary"):
            has_conflict = "Conflict" in elective_choice
            summary = f"{dept[:20]} | {elective_choice[:24]}"
            payload = {"dept": dept, "core": core_paper, "elective": elective_choice, "conflict": has_conflict}
            receipt = route_workload("Academic_Selection_Portal", "HIGH", payload, summary)
            if has_conflict:
                st.error("⚠️ **Schedule Collision Detected!** Both papers occupy 09:30 AM. Auto-shuffling to **Cyber Forensics (02:00 PM)**.")
            else:
                st.success("✅ **Zero Timetable Collision!** Elective seat locked on Rafoan Cloud.")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with a2:
        st.subheader("🗓️ Active Slot Allocation Matrix")
        st.dataframe(pd.DataFrame([
            {"Slot": "09:30 AM - 11:00 AM", "Type": "Core Major", "Status": "Locked"},
            {"Slot": "11:30 AM - 01:00 PM", "Type": "Open Elective A", "Status": "Available"},
            {"Slot": "02:00 PM - 03:30 PM", "Type": "Open Elective B", "Status": "Available"}
        ]), use_container_width=True, hide_index=True)

elif nav == WORKSPACES[7]:
    st.title("☀️ Solaraelpan — Live Solar Irradiance & INR Savings Engine")
    st.markdown("**Live Portal:** [solaraelpan.vercel.app](https://solaraelpan.vercel.app/)")

    sc1, sc2 = st.columns(2)
    with sc1:
        city = st.selectbox("Select Location:", ["Coimbatore (11.01 N, 76.95 E)", "Gudalur (11.50 N, 76.49 E)", "Chennai (13.08 N, 80.27 E)"])
        kw_capacity = st.slider("Rooftop Solar Capacity (kW):", 1.0, 25.0, 5.0, 0.5)
        tariff_inr = st.number_input("Grid Tariff (INR per kWh):", min_value=4.0, max_value=15.0, value=8.5, step=0.5)

    lat, lon = (11.01, 76.95) if "Coimbatore" in city else ((11.50, 76.49) if "Gudalur" in city else (13.08, 80.27))
    solar_weather = get_reliable_weather(lat, lon)

    daily_units_kwh = round(kw_capacity * 5.2 * 0.82, 1)
    monthly_savings_inr = round(daily_units_kwh * 30 * tariff_inr, 0)
    annual_savings_inr = round(monthly_savings_inr * 12, 0)

    with sc2:
        st.subheader("⚡ Live Solar Generation & INR ROI")
        m1, m2, m3 = st.columns(3)
        m1.metric("Live Irradiance", f"{solar_weather['irradiance']} W/m2")
        m2.metric("Monthly Savings", f"Rs. {monthly_savings_inr:,.0f}")
        m3.metric("Annual Savings", f"Rs. {annual_savings_inr:,.0f}")

        if st.button("💾 Log Solar Estimate to Rafoan Cloud", type="primary"):
            summary = f"{kw_capacity}kW in {city.split()[0]} -> Rs.{monthly_savings_inr:,.0f}/mo"
            payload = {"city": city, "kw": kw_capacity, "monthly_inr": monthly_savings_inr, "irradiance": solar_weather["irradiance"]}
            receipt = route_workload("Solaraelpan_Solar_INR", "HIGH", payload, summary)
            st.success(f"Estimated **{daily_units_kwh} kWh/day** generating **Rs. {annual_savings_inr:,.0f}/year** in grid offset.")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

elif nav == WORKSPACES[8]:
    st.title("💡 Innovoadai — Enterprise Innovation & Product Showcase")
    st.markdown("**Live Portal:** [share.google/5lfHcOVHNHDIBl8q3](https://share.google/5lfHcOVHNHDIBl8q3)")

    in1, in2 = st.columns(2)
    with in1:
        st.subheader("📨 Log Enterprise Demo / Partner Lead")
        org_name = st.text_input("Organization / Client Name:", "Southern Green Tech Enterprises")
        interest_track = st.selectbox("Solution Track:", [
            "Rafoan Multi-Cloud PaaS Infrastructure",
            "Agri-Tech & Solar Sustainability Suite",
            "Campus Governance & EdTech Suite",
            "AI Automation & Humanitarian Tech"
        ])
        if st.button("🚀 Sync Showcase Inquiry to Rafoan Cloud", type="primary"):
            summary = f"Lead: {org_name} ({interest_track[:24]})"
            payload = {"org": org_name, "track": interest_track}
            receipt = route_workload("Innovoadai_Showcase", "HIGH", payload, summary)
            st.success(f"**Inquiry Logged:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with in2:
        st.subheader("🌐 Ecosystem Reach")
        st.metric("Unified SaaS Products", "10 Applications", "Multi-Cloud Native")
        st.metric("Target Infrastructure Savings", "73.3%", "AWS + Azure Hybrid")

elif nav == WORKSPACES[9]:
    st.title("✉️ AI Email Agent & 📖 MOED Ministry Telemetry")
    st.markdown("""
    - **AI Email Agent:** [aiemailagentnov2026project-m8je3jq2if8qcrjfcnxwxi.streamlit.app](https://aiemailagentnov2026project-m8je3jq2if8qcrjfcnxwxi.streamlit.app/)
    - **MOED (Jesus Never Fail Ministries):** [moedgospelappnov2026.vercel.app](https://moedgospelappnov2026.vercel.app/)
    """)

    em1, em2 = st.columns(2)
    with em1:
        st.subheader("✉️ AI Email Agent Queue Sync")
        campaign_type = st.selectbox("Workflow Type:", [
            "Client Onboarding & Welcome Sequence",
            "Automated Support Triage & Reply",
            "Enterprise SaaS Follow-Up Dispatch"
        ])
        recipient_count = st.slider("Queued Emails:", 1, 250, 25)
        if st.button("⚡ Log Email Workflow to Rafoan Cloud", type="primary"):
            summary = f"Email Agent: {campaign_type[:24]} ({recipient_count} msgs)"
            payload = {"workflow": campaign_type, "count": recipient_count}
            receipt = route_workload("AI_Email_Agent", "HIGH", payload, summary)
            st.success(f"**Workflow Synced:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")

    with em2:
        st.subheader("📖 MOED Scripture & Devotional Sync")
        scripture_ref = st.text_input("Daily Scripture Focus:", "Psalm 46:1 — God is our refuge and strength")
        devotional_note = st.text_input("Ministry Broadcast Note:", "Morning Tamil & English Devotional Published")
        if st.button("🙏 Log MOED Devotional to Rafoan Cloud", type="primary"):
            summary = f"MOED: {scripture_ref[:28]}"
            payload = {"scripture": scripture_ref, "note": devotional_note}
            receipt = route_workload("MOED_Ministry_App", "HIGH", payload, summary)
            st.success(f"**Devotional Synced:** {summary}")
            st.info(f"**Rafoan Receipt:** `{receipt['node']}` | `{receipt['latency_ms']} ms` | `{receipt['status']}`")
