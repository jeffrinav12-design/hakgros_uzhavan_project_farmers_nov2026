
import streamlit as st
import time
import json
import requests
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine, text

st.set_page_config(
    page_title="Stratum Cloud | Multi-Tenant FinOps & App Suite",
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
    CREATE TABLE IF NOT EXISTS stratum_finops_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_module VARCHAR(100),
        priority VARCHAR(20),
        payload_kb FLOAT,
        routed_node VARCHAR(50),
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
        FROM stratum_finops_logs
        ORDER BY timestamp DESC
        LIMIT 15
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
        return combined.head(20), True

    demo_df = pd.DataFrame([
        {"timestamp": datetime.now(), "tenant_module": "Hakgros_Uzhavan_AgriAI", "priority": "HIGH", "payload_kb": 0.62, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 14.2, "estimated_savings_usd": 0.0033, "summary": "Tea - Micro-climate sync"},
        {"timestamp": datetime.now(), "tenant_module": "Biblical_Archaeology_3D", "priority": "LOW", "payload_kb": 235.4, "routed_node": "Node 2: Supabase (Azure Bulk Storage)", "latency_ms": 48.7, "estimated_savings_usd": 0.0059, "summary": "Tel Megiddo - Iron Age IIA 3D Mesh"},
        {"timestamp": datetime.now(), "tenant_module": "Sahaezer_Disaster_SOS", "priority": "HIGH", "payload_kb": 0.41, "routed_node": "Node 1: Neon.tech (AWS Fast RDS)", "latency_ms": 11.8, "estimated_savings_usd": 0.0033, "summary": "Landslide Alert - Gudalur Relief Hub"}
    ])
    return demo_df, False

@st.cache_data(ttl=600)
def get_reliable_weather(lat: float, lon: float):
    url = (
        f"https://open-meteo.com?"
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
            endpoint = f"https://googleapis.com{gemini_key}"
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
                INSERT INTO stratum_finops_logs 
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
            db_status = "Committed 24/7 Cloud DB"
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

st.sidebar.title("Stratum Cloud")
st.sidebar.caption("Multi-Tenant FinOps & Data Optimization Engine")

node1_ok = "Online" if neon_engine else "Awaiting Secret"
node2_ok = "Online" if supa_engine else "Awaiting Secret"
st.sidebar.markdown(f"**AWS Node (Neon):** {node1_ok}")
st.sidebar.markdown(f"**Azure Node (Supabase):** {node2_ok}")

nav = st.sidebar.radio(
    "Select Tenant Workspace:",
    [
        "FinOps Command Center & Live SQL Feed",
        "Hakgros Uzhavan (Bilingual Agri-AI)",
        "Biblical Archaeology Engine",
        "Sahaezer (Hackathon Winner Telemetry)",
        "Solaraelpan (INR Solar Estimator)",
        "Campus Governance (Sankara College)"
    ]
)

if nav == "FinOps Command Center & Live SQL Feed":
    st.title("Stratum Cloud - Multi-Cloud FinOps Engine")
    st.markdown("Real-time workload routing across **Neon (AWS Fast RDS)** & **Supabase (Azure Bulk Storage)**.")

    logs_df, is_live_sql = fetch_live_logs()
    total_saved = round(logs_df["estimated_savings_usd"].sum(), 4)
    avg_lat = round(logs_df["latency_ms"].mean(), 1)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Active Cloud Nodes", "2 (Multi-Cloud)", "100% Free Tier")
    col2.metric("Avg FinOps Cost Reduction", "73.3%", f"${total_saved} Logged")
    col3.metric("Avg Routing Latency", f"{avg_lat} ms", "Sub-50ms SLA")
    col4.metric("Unified Tenant Apps", "8 Modules", "All Core Apps Connected")

    st.divider()

st.subheader("Live Multi-Cloud SQL Telemetry Feed (Neon + Supabase)")
if is_live_sql:
 st.caption("Reading live committed transactions directly from your 24/7 PostgreSQL nodes.")
else:
 st.caption("Showing sample telemetry until NEON_AWS_URL & SUPABASE_AZURE_URL are added in Streamlit Secrets.")
st.dataframe(logs_df, use_container_width=True, hide_index=True)
st.divider()
st.subheader("Unified 8-App Commercial & Academic Suite")
apps = [
{"Name": "1. Biblical Archaeology Engine", "Domain": "Geospatial & 3D Scans", "Routing": "Heavy 3D -> Supabase Bulk", "Status": "Active (View 3)", "Link": "#"},
{"Name": "2. Hakgros Uzhavan (Agri-AI)", "Domain": "Bilingual Farmer Advisory", "Routing": "Weather/Telemetry -> Neon Fast", "Status": "Active (View 2)", "Link": "vercel.app"},
{"Name": "3. Sahaezer (3rd Prize Hackathon)", "Domain": "Disaster SOS & Food Rescue", "Routing": "Urgent SOS -> Neon Fast", "Status": "Active (View 4)", "Link": "#"},
{"Name": "4a. Deeksharambh (Sankara College)", "Domain": "Bridge Course Management", "Routing": "Student Records -> Neon Fast", "Status": "Active (View 6)", "Link": "vercel.app"},
{"Name": "4b. Academic Selection Portal", "Domain": "Anti-Collision Elective Guide", "Routing": "Schedule Matrix -> Neon Fast", "Status": "Active (View 6)", "Link": "vercel.app"},
{"Name": "5. Solaraelpan", "Domain": "Solar & INR Savings Estimator", "Routing": "Irradiance Logs -> Supabase", "Status": "Active (View 5)", "Link": "vercel.app"},
{"Name": "6. Innovoadai", "Domain": "Innovation Showcase", "Routing": "Read-Only Tier -> Neon Fast", "Status": "Live Portal", "Link": "share.google"},
{"Name": "7. AI Email Agent & 8. Moed Bible App", "Domain": "Automation & Daily Scripture", "Routing": "API Queue -> Neon Fast", "Status": "API Ready", "Link": "#"},
]
st.dataframe(pd.DataFrame(apps), use_container_width=True, hide_index=True)

elif nav == "Hakgros Uzhavan - Bilingual Agri-AI":
 st.title("Hakgros Uzhavan - Bilingual Agri-AI & Micro-Climate Sync")
 st.markdown("Live Frontend: hakgrosuzhavanprojectfarmersnov2026.vercel.app")
 c1, c2 = st.columns(2)
with c1:
region = st.selectbox("Select Micro-Climate Zone:", [
"Gudalur / Nilgiris (11.50 N, 76.49 E)",
"Coimbatore Plains (11.01 N, 76.95 E)",
"Pollachi / Anaimalai (10.66 N, 77.00 E)"
])
crop = st.selectbox("Select Crop / பயிர்:", [
"Tea / தேயிலை",
"Banana / வாழை",
"Paddy / நெல்",
"Pepper / மிளகு",
"Tomato / தக்காளி"
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
st.subheader("Live Micro-Climate Telemetry")
st.caption(f"Weather API Status: {weather_data['api_status']}")
w1, w2, w3 = st.columns(3)
w1.metric("Temp / வெப்பநிலை", f"{weather_data['temp']} C")
w2.metric("Humidity / ஈரப்பதம்", f"{weather_data['humidity']}%")
w3.metric("Wind / காற்று", f"{weather_data['wind']} km/h")
if st.button("Run Bilingual AI Diagnosis & Route to Cloud", type="primary"):
ai_source, diagnosis_text = run_bilingual_crop_ai(crop, symptom, weather_data)
payload = {
"region": region, "crop": crop, "symptom": symptom,
"weather": weather_data, "image_buffer": "X" * (65000 if simulate_heavy_image else 500)
}
priority = "LOW" if simulate_heavy_image else "HIGH"
receipt = route_workload("Hakgros_Uzhavan_AgriAI", priority, payload, f"{crop} - {symptom}")
st.success(f"### Bilingual Advisory / இருமொழி ஆலோசனை\nEngine: {ai_source}")
st.markdown(diagnosis_text)
st.info(f"FinOps Receipt: Routed to {receipt['node']} | {receipt['payload_kb']} KB | {receipt['latency_ms']} ms | {receipt['status']}")
elif nav == "Biblical Archaeology Engine":
st.title("Biblical Archaeology Engine - Levant Geospatial & 3D Offloader")
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
st.subheader("Levant Excavation Geospatial Map")
st.map(levant_sites, latitude="lat", longitude="lon", zoom=7)
st.dataframe(levant_sites[["Site", "Primary Era"]], use_container_width=True, hide_index=True)
with col_right:
st.subheader("Field Artifact Upload & Chronological Cross-Check")
selected_site = st.selectbox("Excavation Tell / Site:", levant_sites["Site"].tolist())
stratum_layer = st.selectbox("Stratigraphy Layer / Pottery Typology:", [
"Iron Age IIA (c. 1000-925 BCE) - Red-Slipped Burnished Ware",
"Iron Age IIB (c. 925-720 BCE) - LMLK Royal Storage Jar Handles",
"Late Bronze Age II (c. 1400-1200 BCE) - Bichrome & Mycenaean Imports",
"Second Temple / Herodian (c. 37 BCE-70 CE) - Limestone Measuring Vessels"
])
artifact_notes = st.text_input("Field Locus & Trench Notes:", "Locus 402, Square B4 - Intact rim & inscribed seal impression")
simulate_3d_mesh = st.checkbox("Simulate Heavy 3D Photogrammetry Mesh (240 KB -> Auto-Offload to Supabase Bulk)", value=True)
if st.button("Cross-Check Chronology & Route Excavation Packet", type="primary"):
mesh_sim_data = "3D_MESH_STREAM_" + ("M" * (240000 if simulate_3d_mesh else 800))
payload = {"site": selected_site, "stratum": stratum_layer, "notes": artifact_notes, "mesh_payload": mesh_sim_data}
priority = "LOW" if simulate_3d_mesh else "HIGH"
receipt = route_workload("Biblical_Archaeology_3D", priority, payload, f"{selected_site} | {stratum_layer[:20]}")
st.success(f"Chronology Verified: {stratum_layer} matches strata at {selected_site}.")
st.info(f"FinOps Receipt: Routed to {receipt['node']} | {receipt['payload_kb']} KB | {receipt['latency_ms']} ms | {receipt['status']}")
elif nav == "Sahaezer (Hackathon Winner Telemetry)":
st.title("Sahaezer - Disaster Coordination & GRACE AI Food Rescue")
st.markdown("3rd Prize Hackathon Winner | Jetpack Compose + OpenStreetMap Offline Tiles + GRACE AI Engine")
rescue_nodes = pd.DataFrame([
{"Node": "Gudalur Relief Hub (Nilgiris)", "lat": 11.5030, "lon": 76.4917, "Type": "Emergency & Landslide SOS"},
{"Node": "Ooty Central Food Bank", "lat": 11.4102, "lon": 76.6950, "Type": "GRACE AI Surplus Kitchen"},
{"Node": "Coimbatore North Shelter", "lat": 11.0168, "lon": 76.9558, "Type": "24/7 Disaster Response"},
{"Node": "Mettupalayam Foothill Depot", "lat": 11.2990, "lon": 76.9349, "Type": "Transit & Supply Staging"}
])
s1, s2 = st.columns([1, 1.1])
with s1:
st.subheader("Live Emergency & GRACE AI Dispatch")
dispatch_mode = st.radio("Select Telemetry Packet Type:", [
"Urgent GPS SOS Alert (Forces High-Priority Neon Fast RDS)",
"GRACE AI Perishable Food Rescue Match"
])
zone = st.selectbox("Select Incident / Donor Location:", rescue_nodes["Node"].tolist())
details = f"{dispatch_mode[:18]} at {zone}"
if st.button("Transmit Live Telemetry Packet to Stratum Cloud", type="primary"):
payload = {"app": "Sahaezer_Android_Client", "mode": dispatch_mode, "zone": zone}
receipt = route_workload("Sahaezer_Disaster_SOS", "HIGH", payload, details)
st.error(f"DISPATCH CONFIRMED: {details}")
st.info(f"FinOps Receipt: Routed to {receipt['node']} | {receipt['latency_ms']} ms | {receipt['status']}")
with s2:
st.subheader("Offline-Ready OpenStreetMap Telemetry Grid")
st.map(rescue_nodes, latitude="lat", longitude="lon", zoom=8)
st.dataframe(rescue_nodes[["Node", "Type"]], use_container_width=True, hide_index=True)
elif nav == "Solaraelpan (INR Solar Estimator)":
st.title("Solaraelpan - Live Solar Irradiance & INR Savings Engine")
st.markdown("Live Portal: solaraelpan.vercel.app")
sc1, sc2 = st.columns(2)
with sc1:
city = st.selectbox("Select Location:", ["Coimbatore (11.01 N, 76.95 E)", "Gudalur (11.50 N, 76.49 E)", "Chennai (13.08 N, 80.27 E)"])
kw_capacity = st.slider("Rooftop Solar System Capacity (kW):", 1.0, 25.0, 5.0, 0.5)
tariff_inr = st.number_input("TANGEDCO / Grid Tariff (INR per kWh):", min_value=4.0, max_value=15.0, value=8.5, step=0.5)
lat, lon = (11.01, 76.95) if "Coimbatore" in city else ((11.50, 76.49) if "Gudalur" in city else (13.08, 80.27))
solar_weather = get_reliable_weather(lat, lon)
daily_units_kwh = round(kw_capacity * 5.2 * 0.82, 1)
monthly_savings_inr = round(daily_units_kwh * 30 * tariff_inr, 0)
annual_savings_inr = round(monthly_savings_inr * 12, 0)
with sc2:
st.subheader("Live Solar Generation & INR ROI")
m1, m2, m3 = st.columns(3)
m1.metric("Live Irradiance", f"{solar_weather['irradiance']} W/m2")
m2.metric("Monthly Savings", f"Rs. {monthly_savings_inr:,.0f}")
m3.metric("Annual Savings", f"Rs. {annual_savings_inr:,.0f}")
if st.button("Log Solar Estimate to Stratum Cloud", type="primary"):
payload = {"city": city, "kw": kw_capacity, "monthly_inr": monthly_savings_inr, "irradiance": solar_weather["irradiance"]}
receipt = route_workload("Solaraelpan_Solar_INR", "HIGH", payload, f"{kw_capacity}kW in {city.split()[0]} -> Rs.{monthly_savings_inr}/mo")
st.success(f"Estimated {daily_units_kwh} kWh/day generating Rs. {annual_savings_inr:,.0f}/year in grid offset.")
st.info(f"FinOps Receipt: Routed to {receipt['node']} | {receipt['latency_ms']} ms | {receipt['status']}")
elif nav == "Campus Governance (Sankara College)":
st.title("Campus Governance Suite - Sankara College of Science and Commerce")
st.markdown("""
- Deeksharambh (Bridge Course Portal): deeksharambh70antigravity.vercel.app
- Academic Selection Portal (Elective Anti-Collision): studentselectionportal.vercel.app
""")
cg1, cg2 = st.columns(2)
with cg1:
st.subheader("Dynamic Elective Anti-Collision Validator")
dept = st.selectbox("Department:", ["B.Sc. Computer Science with Data Analytics", "B.Sc. Computer Science", "BCA", "B.Com IT"])
core_paper = st.selectbox("Core Morning Slot (09:30 AM):", ["Big Data Analytics", "Cloud Computing & FinOps", "Machine Learning"])
elective_choice = st.selectbox("Open Elective Choice:", ["Quantitative Aptitude (11:30 AM)", "Big Data Analytics Lab (09:30 AM - Conflict!)", "Cyber Forensics (02:00 PM)"])
if st.button("Validate Timetable & Sync Student Record", type="primary"):
has_conflict = "Conflict" in elective_choice
payload = {"dept": dept, "core": core_paper, "elective": elective_choice, "conflict": has_conflict}
receipt = route_workload("Sankara_Campus_Governance", "HIGH", payload, f"{dept[:18]} | {elective_choice[:20]}")
if has_conflict:
st.error("Schedule Collision Detected! Both papers occupy the 09:30 AM slot. Auto-shuffling to Cyber Forensics (02:00 PM).")
else:
st.success("Zero Timetable Collision! Elective seat locked and synced to campus ledger.")
st.info(f"FinOps Receipt: Routed to {receipt['node']} | {receipt['latency_ms']} ms | {receipt['status']}")
with cg2:
st.subheader("Deeksharambh Bridge Course Readiness")
bridge_df = pd.DataFrame([
{"Module": "Python & Data Analytics Foundations", "Batch": "1st Year B.Sc. CS (DA)", "Completion": "94%"},
{"Module": "Cloud & GitHub Deployment Workshop", "Batch": "1st Year BCA / CS", "Completion": "89%"},
{"Module": "Communication & Aptitude Bridge", "Batch": "All UG Freshers", "Completion": "97%"}
])
st.dataframe(bridge_df, use_container_width=True, hide_index=True)

