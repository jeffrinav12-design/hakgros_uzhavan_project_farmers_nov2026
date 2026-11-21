import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Leaf,
  CloudSun,
  TrendingUp,
  Globe,
  Menu,
  ShieldCheck,
  Bell,
  ClipboardCheck,
  Volume2,
  Printer,
  Save,
  CheckCircle2,
  MapPin,
  CalendarDays,
  User,
  LockKeyhole,
  LogOut,
  Moon,
  Sun,
  Info,
  Pencil,
  Bot,
  Stethoscope,
  Settings,
  Plus,
  RefreshCw,
  ArrowRight,
  Sprout,
  FlaskConical,
  Search,
  Star,
} from "lucide-react";
import { convertArea, interpretSoilPh } from "./landUtils";
import { buildCropCalendar } from "./cropPlanner";

const parseDiseaseAnalysis = (text) => {
  const labels = [
    ["Disease Name", "disease"],
    ["Crop", "crop"],
    ["Confidence", "confidence"],
    ["Symptoms", "symptoms"],
    ["Possible Cause", "cause"],
    ["Treatment", "treatment"],
    ["Prevention", "prevention"],
    ["Severity", "severity"],
  ];
  const result = {};
  labels.forEach(([label, key], index) => {
    const nextLabels = labels.slice(index + 1).map(([nextLabel]) => nextLabel).join("|");
    const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:${nextLabels}):|$)`, "i"));
    if (match?.[1]?.trim()) result[key] = match[1].trim();
  });
  return Object.keys(result).length >= 2 ? result : null;
};

const landResearchCards = [
  {
    id: "icar-traditional-knowledge",
    title: "Traditional Knowledge in Agriculture",
    source: "ICAR",
    category: "Traditional Agricultural Knowledge",
    description: "Indian agricultural knowledge resources for crop, soil and indigenous technical practices.",
    year: "2024",
    url: "https://icar.org.in/",
    type: "Research / Knowledge Resource",
  },
  {
    id: "fao-soil-portal",
    title: "FAO Soils Portal",
    source: "FAO",
    category: "Soil Science",
    description: "Soil information, land evaluation guidance and sustainable land management resources.",
    year: "2024",
    url: "https://www.fao.org/soils-portal/en/",
    type: "Technical Resource",
  },
  {
    id: "icar-crop-research",
    title: "ICAR Crop and Soil Research Resources",
    source: "ICAR",
    category: "Agricultural Research",
    description: "Published crop, soil and nutrient management resources from ICAR institutions.",
    year: "2024",
    url: "https://icar.org.in/",
    type: "Research / Knowledge Resource",
  },
  {
    id: "soil-health-card",
    title: "Soil Health Card Programme",
    source: "Government of India",
    category: "Soil Health",
    description: "Framework for soil testing, nutrient management, and field-level soil health interpretation.",
    year: "2024",
    url: "https://soilhealth.dac.gov.in/",
    type: "Government Resource",
  },
];

function App() {

  // ===========================
  // STATES
  // ===========================

  const [language, setLanguage] = useState(
    () => localStorage.getItem("hakgros_language") || "en"
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("hakgros_theme") || "light"
  );

  const [query, setQuery] = useState("");

  const [response, setResponse] = useState("");
  const [responseSource, setResponseSource] = useState("");

  const [farmers, setFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [farmersError, setFarmersError] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [marketPrices, setMarketPrices] = useState([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [analytics, setAnalytics] = useState({
    totalFarmers: 0,
    totalAdvisories: 0,
    diseaseReports: 0,
  });

  const [editingId, setEditingId] = useState(null);
  const [farmerMessage, setFarmerMessage] = useState("");
  const [farmerError, setFarmerError] = useState("");
  const [farmerSubmitting, setFarmerSubmitting] = useState(false);
  const [farmerDeletingId, setFarmerDeletingId] = useState(null);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerCropFilter, setFarmerCropFilter] = useState("all");
  const [farmerSortBy, setFarmerSortBy] = useState("name-asc");
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const [landRecords, setLandRecords] = useState([]);
  const [landLoading, setLandLoading] = useState(false);
  const [landError, setLandError] = useState("");
  const [landMessage, setLandMessage] = useState("");
  const [landForm, setLandForm] = useState({
    landName: "",
    village: "",
    district: "",
    state: "",
    surveyNumber: "",
    areaValue: "",
    areaUnit: "Acre",
    terrain: "Flat",
    drainage: "Well Drained",
    waterSource: "Borewell",
    irrigation: "Available",
    soilDepth: "Deep",
    stoniness: "Low",
    landUse: "Agricultural",
    soilType: "Sandy Loam",
    soilPh: "",
    ecValue: "",
    ecUnit: "dS/m",
    organicCarbon: "",
    nitrogenValue: "",
    nitrogenUnit: "kg/ha",
    phosphorusValue: "",
    phosphorusUnit: "kg/ha",
    potassiumValue: "",
    potassiumUnit: "kg/ha",
    sulfurValue: "",
    sulfurUnit: "mg/kg",
    zincValue: "",
    zincUnit: "mg/kg",
    ironValue: "",
    ironUnit: "mg/kg",
    copperValue: "",
    copperUnit: "mg/kg",
    manganeseValue: "",
    manganeseUnit: "mg/kg",
    boronValue: "",
    boronUnit: "mg/kg",
    currentCrop: "",
    previousCrop: "",
    season: "",
    year: "",
    notes: "",
  });
  const [selectedLandId, setSelectedLandId] = useState(null);
  const [landAnalysis, setLandAnalysis] = useState(null);
  const [landAnalysisLoading, setLandAnalysisLoading] = useState(false);
  const [cropPlannerForm, setCropPlannerForm] = useState({
    crop: "Rice",
    season: "Kharif",
    plantingDate: new Date().toISOString().slice(0, 10),
    waterAvailability: "Adequate",
    soilType: "Sandy Loam",
    location: "Coimbatore",
  });
  const [cropPlanForm, setCropPlanForm] = useState({
    cropName: "Rice",
    variety: "",
    season: "Kharif",
    location: "Coimbatore",
    landArea: "1",
    sowingDate: new Date().toISOString().slice(0, 10),
    expectedHarvestDate: "",
  });
  const [cropPlans, setCropPlans] = useState([]);
  const [cropPlansLoading, setCropPlansLoading] = useState(false);
  const [cropPlansError, setCropPlansError] = useState("");
  const [selectedCropPlanId, setSelectedCropPlanId] = useState(null);
  const [customTaskForm, setCustomTaskForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    category: "Sowing",
    notes: "",
  });
  const [cropPlanMessage, setCropPlanMessage] = useState("");
  const [cropPlanSubmitting, setCropPlanSubmitting] = useState(false);
  const [researchQuery, setResearchQuery] = useState("");
  const [savedResearch, setSavedResearch] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hakgros_saved_research")) || []; } catch { return []; }
  });

  const [formData, setFormData] = useState({
    name: "",
    village: "",
    cropType: "",
    landSize: "",
  });

  const [activePage, setActivePage] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [useGemini, setUseGemini] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("hakgros_token") || ""
  );
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("hakgros_user")) || null
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("hakgros_token")
  );
  const [preview, setPreview] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [advisoryContext, setAdvisoryContext] = useState({ crop: "", stage: "", location: "Coimbatore", urgency: "routine" });
  const [savedAdvisories, setSavedAdvisories] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hakgros_advisories")) || []; } catch { return []; }
  });
  const [settings, setSettings] = useState(() => ({
    notifications: localStorage.getItem("hakgros_notifications") !== "false",
    highContrast: localStorage.getItem("hakgros_high_contrast") === "true",
    dataSaver: localStorage.getItem("hakgros_data_saver") === "true",
  }));
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const API_BASE = process.env.REACT_APP_API_BASE || "";
  const getAuthHeaders = useCallback(() => ({
    ...(authToken
      ? { Authorization: `Bearer ${authToken}` }
      : {}),
  }), [authToken]);

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm({
      ...authForm,
      [name]: name === "email" ? value.trim() : value,
    });
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("hakgros_token");
    localStorage.removeItem("hakgros_user");
    setAuthToken("");
    setUser(null);
    setIsAuthenticated(false);
    setActivePage("auth");
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    const farmerName = String(authForm.name || "").trim();
    const farmerPlace = String(authForm.email || "").trim();
    const farmerArea = String(authForm.password || "").trim();

    if (!farmerName || !farmerPlace || !farmerArea) {
      setAuthError("Please enter farmer name, place, and land area.");
      return;
    }

    const nextUser = {
      id: "farmer-demo",
      name: farmerName,
      email: `${farmerName.toLowerCase().replace(/\s+/g, ".")}@hakgros.local`,
      village: farmerPlace,
      place: farmerPlace,
      landSize: farmerArea,
    };

    localStorage.setItem("hakgros_token", "demo-session");
    localStorage.setItem("hakgros_user", JSON.stringify(nextUser));
    setAuthToken("demo-session");
    setUser(nextUser);
    setIsAuthenticated(true);
    setActivePage("dashboard");
    setAuthForm({ name: "", email: "", password: "" });
  };

  const t = useCallback(
    (en, ta) => (language === "en" ? en : ta),
    [language]
  );

  useEffect(() => {
    localStorage.setItem("hakgros_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("hakgros_theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const authFetch = useCallback(async (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...getAuthHeaders(),
      },
    });
  }, [getAuthHeaders]);

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/weather?city=Coimbatore`
      );

      if (!res.ok) {
        throw new Error("Unable to load weather data");
      }

      const data = await res.json();
      setWeather(data);
    } catch (error) {
      console.log("Weather fetch error:", error);
      setWeatherError(error.message || "Unable to load weather data");
    } finally {
      setWeatherLoading(false);
    }
  }, [API_BASE]);

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      "01d": "☀️",
      "01n": "🌙",
      "02d": "⛅",
      "02n": "☁️",
      "03d": "☁️",
      "03n": "☁️",
      "04d": "☁️",
      "04n": "☁️",
      "09d": "🌧️",
      "09n": "🌧️",
      "10d": "🌦️",
      "10n": "🌧️",
      "11d": "⛈️",
      "11n": "⛈️",
      "13d": "❄️",
      "13n": "❄️",
      "50d": "🌫️",
      "50n": "🌫️",
    };

    return iconMap[iconCode] || "🌤️";
  };

  useEffect(() => {
    if (isAuthenticated) {
      setFarmersLoading(true);
      setFarmersError("");
      authFetch(`${API_BASE}/api/farmers`)
        .then((res) => res.json())
        .then((data) => {
          if (!data || !Array.isArray(data.farmers)) throw new Error("Farmer data unavailable");
          setFarmers(data.farmers || []);
        })
        .catch((err) => {
          console.log(err);
          setFarmers([]);
          setFarmersError(language === "en" ? "Farmer data unavailable" : "விவசாயி தரவு கிடைக்கவில்லை");
        })
        .finally(() => setFarmersLoading(false));

      setMarketLoading(true);
      setMarketError("");
      fetch(`${API_BASE}/api/market`)
        .then((res) => res.json())
        .then((data) => {
          if (!Array.isArray(data)) throw new Error("Market data unavailable");
          setMarketPrices(data || []);
        })
        .catch((err) => {
          console.log(err);
          setMarketPrices([]);
          setMarketError(language === "en" ? "Market data unavailable" : "சந்தை தரவு கிடைக்கவில்லை");
        })
        .finally(() => setMarketLoading(false));

      authFetch(`${API_BASE}/api/analytics`)
        .then((res) => res.json())
        .then((data) => {
          setAnalytics(data || {});
        })
        .catch((err) => console.log(err));
    } else {
      setFarmers([]);
      setFarmersLoading(false);
      setFarmersError("");
      setMarketPrices([]);
      setMarketLoading(false);
      setMarketError("");
      setAnalytics({
        totalFarmers: 0,
        totalAdvisories: 0,
        diseaseReports: 0,
      });
    }

    fetchWeather();
  }, [API_BASE, authFetch, fetchWeather, isAuthenticated, language]);

  useEffect(() => {
    const sections = document.querySelectorAll(".reveal-on-scroll");
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.14 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [activePage, language]);

  useEffect(() => {
    if (!isAuthenticated) return;
    authFetch(`${API_BASE}/api/profile`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setProfileName(data.user.name || "");
          localStorage.setItem("hakgros_user", JSON.stringify(data.user));
        }
      })
        .catch(() => setProfileError(language === "en" ? "Unable to load profile." : "சுயவிவரத்தை ஏற்ற முடியவில்லை."));
      }, [API_BASE, authFetch, isAuthenticated, language]);

  const fetchCropPlans = useCallback(async () => {
    if (!isAuthenticated) return;
    setCropPlansLoading(true);
    setCropPlansError("");

    try {
      const res = await authFetch(`${API_BASE}/api/crop-plans`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to load crop plans.");
      setCropPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (error) {
      setCropPlans([]);
      setCropPlansError(error.message || (language === "en" ? "Unable to load crop plans." : "பயிர் திட்டங்களை ஏற்ற முடியவில்லை."));
    } finally {
      setCropPlansLoading(false);
    }
  }, [API_BASE, authFetch, isAuthenticated, language]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCropPlans();
    }
  }, [fetchCropPlans, isAuthenticated]);

  // ===========================
  // LANGUAGE
  // ===========================

  const toggleLanguage = () => {

    setLanguage(
      language === "en"
        ? "ta"
        : "en"
    );

  };

  // ===========================
  // AI ADVISORY
  // ===========================

  const handleAskAI = async () => {
    if (!query) return;

    setIsLoadingAdvice(true);
    setResponse("");
    setResponseSource("");

    const contextualQuery = [
      query,
      advisoryContext.crop && `Crop: ${advisoryContext.crop}`,
      advisoryContext.stage && `Growth stage: ${advisoryContext.stage}`,
      advisoryContext.location && `Location: ${advisoryContext.location}`,
      `Urgency: ${advisoryContext.urgency}`,
    ].filter(Boolean).join(". ");

    try {
      const response = await authFetch(`${API_BASE}/api/get-advice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: contextualQuery,
          language,
          useGemini,
        }),
      });

      const data = await response.json();

      setResponse(data.advice || t("Unable to get AI advice.", "AI ஆலோசனை பெற முடியவில்லை."));
      setResponseSource(data.source || "local");
    } catch (error) {

      console.log(error);

      setResponse("Unable to get AI advice.");
      setResponseSource("local");

    } finally {
      setIsLoadingAdvice(false);
    }
  };

  const updateAdvisoryContext = (event) => setAdvisoryContext({ ...advisoryContext, [event.target.name]: event.target.value });

  const saveAdvisory = () => {
    if (!response) return;
    const nextAdvisories = [{ id: Date.now(), question: query, response, date: new Date().toLocaleDateString() }, ...savedAdvisories].slice(0, 5);
    setSavedAdvisories(nextAdvisories);
    localStorage.setItem("hakgros_advisories", JSON.stringify(nextAdvisories));
  };

  const speakAdvice = () => {
    if (response && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(response));
    }
  };

  const saveSettings = () => {
    localStorage.setItem("hakgros_notifications", String(settings.notifications));
    localStorage.setItem("hakgros_high_contrast", String(settings.highContrast));
    localStorage.setItem("hakgros_data_saver", String(settings.dataSaver));
    localStorage.setItem("hakgros_theme", theme);
    localStorage.setItem("hakgros_language", language);
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2500);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const res = await authFetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to update profile");
      setUser(data.user);
      localStorage.setItem("hakgros_user", JSON.stringify(data.user));
      setProfileEditMode(false);
      setProfileMessage(t("Profile updated successfully.", "சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது."));
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t("New passwords do not match.", "புதிய கடவுச்சொற்கள் பொருந்தவில்லை."));
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await authFetch(`${API_BASE}/api/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to change password");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(t("Password changed successfully.", "கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது."));
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ===========================
  // FORM CHANGE
  // ===========================

  const handleChange = (e) => {

    setFormData({

      ...formData,

      [e.target.name]:
        e.target.value,

    });

  };

  // ===========================
  // ADD / UPDATE FARMER
  // ===========================

  const farmerCropOptions = useMemo(
    () =>
      Array.from(
        new Set(
          farmers
            .map((farmer) => farmer.cropType)
            .filter(Boolean)
            .map((crop) => String(crop).trim())
        )
      ).sort((a, b) => a.localeCompare(b)),
    [farmers]
  );

  const farmerStats = useMemo(() => {
    const validCreatedDates = farmers
      .map((farmer) => farmer.createdAt)
      .filter((value) => value && !Number.isNaN(new Date(value).getTime()));

    const recentAdded = validCreatedDates.filter((value) => {
      const created = new Date(value);
      const now = Date.now();
      return now - created.getTime() <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    const uniqueLocations = new Set(
      farmers
        .map((farmer) => farmer.village)
        .filter(Boolean)
        .map((value) => String(value).trim())
    ).size;

    return {
      totalFarmers: farmers.length || "N/A",
      recentAdded: validCreatedDates.length ? recentAdded : "N/A",
      locations: uniqueLocations || "N/A",
      records: farmers.length || "N/A",
    };
  }, [farmers]);

  const filteredFarmers = useMemo(() => {
    const query = farmerSearch.trim().toLowerCase();

    let result = [...farmers];

    if (query) {
      result = result.filter((farmer) =>
        [farmer.name, farmer.village, farmer.cropType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (farmerCropFilter !== "all") {
      result = result.filter(
        (farmer) => String(farmer.cropType || "").trim() === farmerCropFilter
      );
    }

    result.sort((a, b) => {
      switch (farmerSortBy) {
        case "name-desc":
          return String(b.name || "").localeCompare(String(a.name || ""));
        case "land-desc":
          return Number(b.landSize || 0) - Number(a.landSize || 0);
        case "land-asc":
          return Number(a.landSize || 0) - Number(b.landSize || 0);
        case "recent":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "location":
          return String(a.village || "").localeCompare(String(b.village || ""));
        case "name-asc":
        default:
          return String(a.name || "").localeCompare(String(b.name || ""));
      }
    });

    return result;
  }, [farmers, farmerCropFilter, farmerSearch, farmerSortBy]);

  const validateFarmerForm = (payload) => {
    if (!payload.name || !payload.name.trim()) {
      return t("Farmer name is required.", "விவசாயியின் பெயர் அவசியம்.");
    }
    if (!payload.village || !payload.village.trim()) {
      return t("Village is required.", "ஊர் அவசியம்.");
    }
    if (!payload.cropType || !payload.cropType.trim()) {
      return t("Crop type is required.", "பயிர் வகை அவசியம்.");
    }
    if (!Number.isFinite(Number(payload.landSize)) || Number(payload.landSize) < 0) {
      return t("Land area must be a valid value greater than or equal to zero.", "நிலப்பரப்பு 0 அல்லது அதற்கு மேல் சரியான மதிப்பாக இருக்க வேண்டும்.");
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFarmerError("");
    setFarmerMessage("");

    const payload = {
      name: String(formData.name || "").trim(),
      village: String(formData.village || "").trim(),
      cropType: String(formData.cropType || "").trim(),
      landSize: Number(formData.landSize),
    };

    const validationError = validateFarmerForm(payload);
    if (validationError) {
      setFarmerError(validationError);
      return;
    }

    setFarmerSubmitting(true);

    try {
      let url = `${API_BASE}/api/farmers`;
      let method = "POST";

      if (editingId) {
        url = `${API_BASE}/api/farmers/${editingId}`;
        method = "PUT";
      }

      const res = await authFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 401) {
        setFarmerError(t("Your session has expired. Please login again.", "உங்கள் அமர்வு முடிந்துவிட்டது. மீண்டும் உள்நுழையவும்."));
        return;
      }
      if (res.status === 403) {
        setFarmerError(t("You are not authorized to perform this action.", "இந்த நடவடிக்கையைச் செய்ய உங்களுக்கு அங்கீகாரம் இல்லை."));
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || t("Unable to save farmer. Please try again.", "விவசாயியைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      }

      if (editingId) {
        setFarmers((currentFarmers) =>
          currentFarmers.map((farmer) =>
            farmer._id === editingId ? data.farmer : farmer
          )
        );
        setFarmerMessage(t("Farmer updated successfully.", "விவசாயி வெற்றிகரமாக புதுப்பிக்கப்பட்டார்."));
      } else {
        setFarmers((currentFarmers) => [data.farmer, ...currentFarmers]);
        setFarmerMessage(t("Farmer added successfully.", "விவசாயி வெற்றிகரமாக சேர்க்கப்பட்டார்."));
      }

      setEditingId(null);
      setSelectedFarmer(null);
      setFormData({ name: "", village: "", cropType: "", landSize: "" });
    } catch (error) {
      setFarmerError(error.message || t("Unable to save farmer. Please try again.", "விவசாயியைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    } finally {
      setFarmerSubmitting(false);
    }
  };

  // ===========================
  // DELETE FARMER
  // ===========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      t(
        "Are you sure you want to delete this farmer?\nThis action cannot be undone.",
        "இந்த விவசாயியை நீக்க விரும்புகிறீர்களா?\nஇந்த செயல் மீட்டெடுக்க முடியாது."
      )
    );

    if (!confirmDelete) return;

    setFarmerDeletingId(id);
    setFarmerError("");
    setFarmerMessage("");

    try {
      const res = await authFetch(`${API_BASE}/api/farmers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.status === 401) {
        setFarmerError(t("Your session has expired. Please login again.", "உங்கள் அமர்வு முடிந்துவிட்டது. மீண்டும் உள்நுழையவும்."));
        return;
      }
      if (res.status === 403) {
        setFarmerError(t("You are not authorized to perform this action.", "இந்த நடவடிக்கையைச் செய்ய உங்களுக்கு அங்கீகாரம் இல்லை."));
        return;
      }
      if (res.status === 404) {
        setFarmerError(t("Farmer not found.", "விவசாயி கிடைக்கவில்லை."));
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || t("Unable to delete farmer. Please try again.", "விவசாயியை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      }

      setFarmers((currentFarmers) => currentFarmers.filter((farmer) => farmer._id !== id));
      setSelectedFarmer((current) => (current && current._id === id ? null : current));
      setFarmerMessage(t("Farmer deleted successfully.", "விவசாயி வெற்றிகரமாக நீக்கப்பட்டார்."));
    } catch (error) {
      setFarmerError(error.message || t("Unable to delete farmer. Please try again.", "விவசாயியை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    } finally {
      setFarmerDeletingId(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    setUploadMessage("");
    setAnalysis(null);
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      e.target.value = "";
      setSelectedImage(null);
      setPreview("");
      setUploadMessage(t("Please upload a JPG, PNG, or WEBP image.", "JPG, PNG அல்லது WEBP படத்தை பதிவேற்றவும்."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = "";
      setSelectedImage(null);
      setPreview("");
      setUploadMessage(t("Image size must be less than 5 MB.", "படத்தின் அளவு 5 MB-க்கு குறைவாக இருக்க வேண்டும்."));
      return;
    }

    setSelectedImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleImageUpload = async () => {
    if (!selectedImage) {
      setUploadMessage(t("Please select an image first.", "தயவுசெய்து முதலில் ஒரு படத்தை தேர்ந்தெடுக்கவும்."));
      return;
    }

    setIsAnalyzing(true);
    setUploadMessage("");
    setAnalysis(null);

    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("language", language);

    try {
      const response = await authFetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setUploadMessage(t("Your session has expired. Please login again.", "உங்கள் அமர்வு முடிந்துவிட்டது. மீண்டும் உள்நுழையவும்."));
        return;
      }
      if (!response.ok) {
        throw new Error(data.message || t("AI analysis is temporarily unavailable. Please try again.", "AI பகுப்பாய்வு தற்காலிகமாக கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."));
      }

      setAnalysis({ disease: data.diagnosis || "", structured: parseDiseaseAnalysis(data.diagnosis || "") });
    } catch (error) {
      console.error("Crop disease upload error:", error);
      setUploadMessage(error instanceof TypeError
        ? t("Unable to connect to the server.", "சேவையகத்துடன் இணைக்க முடியவில்லை.")
        : error.message || t("Something went wrong. Please try again.", "ஏதோ தவறு ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetDiseaseAnalysis = () => {
    setSelectedImage(null);
    setPreview("");
    setAnalysis(null);
    setUploadMessage("");
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    setLandLoading(true);
    setLandError("");
    authFetch(`${API_BASE}/api/lands`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.lands) setLandRecords(data.lands || []);
        else setLandRecords([]);
      })
      .catch(() => setLandError(language === "en" ? "Unable to load land records." : "நில பதிவுகளை ஏற்ற முடியவில்லை."))
      .finally(() => setLandLoading(false));
  }, [API_BASE, authFetch, isAuthenticated, language]);

  const areaConversion = useMemo(() => {
    if (landForm.areaValue === "" || landForm.areaValue == null) return null;
    const value = Number(landForm.areaValue);
    if (!Number.isFinite(value)) return null;
    return {
      acre: Number(convertArea(value, landForm.areaUnit, "Acre").toFixed(4)),
      cent: Number(convertArea(value, landForm.areaUnit, "Cent").toFixed(2)),
      hectare: Number(convertArea(value, landForm.areaUnit, "Hectare").toFixed(4)),
      squareMeter: Number(convertArea(value, landForm.areaUnit, "SquareMeter").toFixed(2)),
    };
  }, [landForm.areaUnit, landForm.areaValue]);

  const soilPhSummary = useMemo(() => {
    if (landForm.soilPh === "" || landForm.soilPh == null) return t("Not available", "கிடைக்கவில்லை");
    return interpretSoilPh(Number(landForm.soilPh));
  }, [landForm.soilPh, t]);

  const filteredResearch = useMemo(() => {
    const query = researchQuery.trim().toLowerCase();
    if (!query) return landResearchCards;
    return landResearchCards.filter((item) =>
      [item.title, item.source, item.category, item.description].join(" ").toLowerCase().includes(query)
    );
  }, [researchQuery]);

  const cropPlannerCalendar = useMemo(() => buildCropCalendar({
    ...cropPlannerForm,
    crop: cropPlannerForm.crop || landForm.currentCrop || "Rice",
    season: cropPlannerForm.season || landForm.season || "Kharif",
    soilType: cropPlannerForm.soilType || landForm.soilType || "Sandy Loam",
    location: cropPlannerForm.location || landForm.village || "Coimbatore",
  }), [cropPlannerForm, landForm.currentCrop, landForm.season, landForm.soilType, landForm.village]);

  const handleLandChange = (e) => {
    const { name, value } = e.target;
    setLandForm((current) => ({ ...current, [name]: value }));
  };

  const resetLandForm = () => {
    setSelectedLandId(null);
    setLandForm({
      landName: "",
      village: "",
      district: "",
      state: "",
      surveyNumber: "",
      areaValue: "",
      areaUnit: "Acre",
      terrain: "Flat",
      drainage: "Well Drained",
      waterSource: "Borewell",
      irrigation: "Available",
      soilDepth: "Deep",
      stoniness: "Low",
      landUse: "Agricultural",
      soilType: "Sandy Loam",
      soilPh: "",
      ecValue: "",
      ecUnit: "dS/m",
      organicCarbon: "",
      nitrogenValue: "",
      nitrogenUnit: "kg/ha",
      phosphorusValue: "",
      phosphorusUnit: "kg/ha",
      potassiumValue: "",
      potassiumUnit: "kg/ha",
      sulfurValue: "",
      sulfurUnit: "mg/kg",
      zincValue: "",
      zincUnit: "mg/kg",
      ironValue: "",
      ironUnit: "mg/kg",
      copperValue: "",
      copperUnit: "mg/kg",
      manganeseValue: "",
      manganeseUnit: "mg/kg",
      boronValue: "",
      boronUnit: "mg/kg",
      currentCrop: "",
      previousCrop: "",
      season: "",
      year: "",
      notes: "",
    });
    setLandMessage("");
    setLandError("");
  };

  const handleLandSubmit = async (event) => {
    event.preventDefault();
    setLandMessage("");
    setLandError("");
    setLandLoading(true);

    const payload = {
      ...landForm,
      areaValue: landForm.areaValue === "" ? null : Number(landForm.areaValue),
      soilPh: landForm.soilPh === "" ? null : Number(landForm.soilPh),
      ecValue: landForm.ecValue === "" ? null : Number(landForm.ecValue),
      organicCarbon: landForm.organicCarbon === "" ? null : Number(landForm.organicCarbon),
      nitrogenValue: landForm.nitrogenValue === "" ? null : Number(landForm.nitrogenValue),
      phosphorusValue: landForm.phosphorusValue === "" ? null : Number(landForm.phosphorusValue),
      potassiumValue: landForm.potassiumValue === "" ? null : Number(landForm.potassiumValue),
      sulfurValue: landForm.sulfurValue === "" ? null : Number(landForm.sulfurValue),
      zincValue: landForm.zincValue === "" ? null : Number(landForm.zincValue),
      ironValue: landForm.ironValue === "" ? null : Number(landForm.ironValue),
      copperValue: landForm.copperValue === "" ? null : Number(landForm.copperValue),
      manganeseValue: landForm.manganeseValue === "" ? null : Number(landForm.manganeseValue),
      boronValue: landForm.boronValue === "" ? null : Number(landForm.boronValue),
      year: landForm.year === "" ? null : Number(landForm.year),
    };

    try {
      const method = selectedLandId ? "PUT" : "POST";
      const url = selectedLandId ? `${API_BASE}/api/lands/${selectedLandId}` : `${API_BASE}/api/lands`;
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to save land record.");

      const savedLand = data.land;
      setLandRecords((current) => {
        if (selectedLandId) {
          return current.map((entry) => (entry._id === selectedLandId ? savedLand : entry));
        }
        return [savedLand, ...current];
      });
      setLandMessage(selectedLandId ? t("Land record updated successfully.", "நில பதிவு வெற்றிகரமாக புதுப்பிக்கப்பட்டது.") : t("Land record created successfully.", "நில பதிவு வெற்றிகரமாக உருவாக்கப்பட்டது."));
      resetLandForm();
    } catch (error) {
      setLandError(error.message || t("Unable to save land record.", "நில பதிவை சேமிக்க முடியவில்லை."));
    } finally {
      setLandLoading(false);
    }
  };

  const editLand = (land) => {
    setSelectedLandId(land._id);
    setLandForm({
      landName: land.landName || "",
      village: land.village || "",
      district: land.district || "",
      state: land.state || "",
      surveyNumber: land.surveyNumber || "",
      areaValue: land.areaValue ?? "",
      areaUnit: land.areaUnit || "Acre",
      terrain: land.terrain || "Flat",
      drainage: land.drainage || "Well Drained",
      waterSource: land.waterSource || "Borewell",
      irrigation: land.irrigation || "Available",
      soilDepth: land.soilDepth || "Deep",
      stoniness: land.stoniness || "Low",
      landUse: land.landUse || "Agricultural",
      soilType: land.soilType || "Sandy Loam",
      soilPh: land.soilPh ?? "",
      ecValue: land.ecValue ?? "",
      ecUnit: land.ecUnit || "dS/m",
      organicCarbon: land.organicCarbon ?? "",
      nitrogenValue: land.nitrogen?.value ?? "",
      nitrogenUnit: land.nitrogen?.unit || "kg/ha",
      phosphorusValue: land.phosphorus?.value ?? "",
      phosphorusUnit: land.phosphorus?.unit || "kg/ha",
      potassiumValue: land.potassium?.value ?? "",
      potassiumUnit: land.potassium?.unit || "kg/ha",
      sulfurValue: land.sulfur?.value ?? "",
      sulfurUnit: land.sulfur?.unit || "mg/kg",
      zincValue: land.zinc?.value ?? "",
      zincUnit: land.zinc?.unit || "mg/kg",
      ironValue: land.iron?.value ?? "",
      ironUnit: land.iron?.unit || "mg/kg",
      copperValue: land.copper?.value ?? "",
      copperUnit: land.copper?.unit || "mg/kg",
      manganeseValue: land.manganese?.value ?? "",
      manganeseUnit: land.manganese?.unit || "mg/kg",
      boronValue: land.boron?.value ?? "",
      boronUnit: land.boron?.unit || "mg/kg",
      currentCrop: land.currentCrop || "",
      previousCrop: land.previousCrop || "",
      season: land.season || "",
      year: land.year ?? "",
      notes: land.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteLand = async (landId) => {
    const confirmed = window.confirm(t("Delete this land record?", "இந்த நிலப் பதிவை நீக்க விரும்புகிறீர்களா?"));
    if (!confirmed) return;

    try {
      const res = await authFetch(`${API_BASE}/api/lands/${landId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to delete land.");
      setLandRecords((current) => current.filter((land) => land._id !== landId));
      if (selectedLandId === landId) resetLandForm();
      setLandMessage(t("Land record deleted successfully.", "நில பதிவு வெற்றிகரமாக நீக்கப்பட்டது."));
    } catch (error) {
      setLandError(error.message || t("Unable to delete land record.", "நில பதிவை நீக்க முடியவில்லை."));
    }
  };

  const analyzeLand = async () => {
    setLandAnalysisLoading(true);
    setLandError("");
    try {
      const payload = {
        ...landForm,
        areaValue: landForm.areaValue === "" ? null : Number(landForm.areaValue),
        soilPh: landForm.soilPh === "" ? null : Number(landForm.soilPh),
        ecValue: landForm.ecValue === "" ? null : Number(landForm.ecValue),
        organicCarbon: landForm.organicCarbon === "" ? null : Number(landForm.organicCarbon),
      };
      const res = await authFetch(`${API_BASE}/api/land-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to analyze land.");
      setLandAnalysis(data.analysis || null);
    } catch (error) {
      setLandError(error.message || t("Unable to analyze land.", "நிலத்தை பகுப்பாய்வு செய்ய முடியவில்லை."));
    } finally {
      setLandAnalysisLoading(false);
    }
  };

  const saveResearch = (research) => {
    const exists = savedResearch.some((item) => item.id === research.id);
    const next = exists ? savedResearch.filter((item) => item.id !== research.id) : [research, ...savedResearch].slice(0, 8);
    setSavedResearch(next);
    localStorage.setItem("hakgros_saved_research", JSON.stringify(next));
  };

  const createDefaultCropTasks = (plan) => {
    const cropName = plan?.cropName || cropPlanForm.cropName || "Rice";
    const sowingDate = plan?.sowingDate || cropPlanForm.sowingDate || new Date().toISOString().slice(0, 10);
    const location = plan?.location || cropPlanForm.location || "Coimbatore";
    const season = plan?.season || cropPlanForm.season || "Kharif";
    const seedPlan = buildCropCalendar({
      crop: cropName,
      season,
      plantingDate: sowingDate,
      waterAvailability: "Adequate",
      soilType: "Sandy Loam",
      location,
    });

    return seedPlan.map((task) => ({
      _id: `${task.stage}-${task.date}`,
      title: task.stage,
      category: task.stage,
      plannedDate: task.date,
      status: task.status || "Upcoming",
      description: task.advice,
      notes: "",
    }));
  };

  const getTimelineTasks = (plan) => {
    if (!plan) return createDefaultCropTasks(cropPlanForm);
    if (Array.isArray(plan.tasks) && plan.tasks.length > 0) {
      return plan.tasks.map((task) => ({
        ...task,
        plannedDate: task.plannedDate ? new Date(task.plannedDate).toISOString().slice(0, 10) : task.date || "",
        status: task.status || "Upcoming",
      }));
    }
    return createDefaultCropTasks(plan);
  };

  const normalizePlanForm = (plan) => ({
    cropName: plan?.cropName || "Rice",
    variety: plan?.variety || "",
    season: plan?.season || "Kharif",
    location: plan?.location || "Coimbatore",
    landArea: plan?.landArea != null ? String(plan.landArea) : "1",
    sowingDate: plan?.sowingDate ? new Date(plan.sowingDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    expectedHarvestDate: plan?.expectedHarvestDate ? new Date(plan.expectedHarvestDate).toISOString().slice(0, 10) : "",
  });

  const resetCropPlanForm = () => {
    setCropPlanForm({
      cropName: "Rice",
      variety: "",
      season: "Kharif",
      location: "Coimbatore",
      landArea: "1",
      sowingDate: new Date().toISOString().slice(0, 10),
      expectedHarvestDate: "",
    });
    setSelectedCropPlanId(null);
    setCustomTaskForm({
      title: "",
      date: new Date().toISOString().slice(0, 10),
      category: "Sowing",
      notes: "",
    });
  };

  const handleCropPlanSubmit = async (event) => {
    event.preventDefault();
    setCropPlanMessage("");
    setCropPlansError("");

    const landAreaValue = Number(cropPlanForm.landArea);
    if (!cropPlanForm.cropName.trim()) {
      setCropPlansError(t("Crop is required.", "பயிர் அவசியம்."));
      return;
    }
    if (!cropPlanForm.sowingDate) {
      setCropPlansError(t("Sowing date is required.", "விதைப்பு தேதி அவசியம்."));
      return;
    }
    if (!Number.isFinite(landAreaValue) || landAreaValue <= 0) {
      setCropPlansError(t("Land area must be a valid positive number.", "நிலப்பரப்பு சரியான நேர்மறை எண்ணாக இருக்க வேண்டும்."));
      return;
    }

    setCropPlanSubmitting(true);

    try {
      const payload = {
        ...cropPlanForm,
        landArea: landAreaValue,
        tasks: createDefaultCropTasks({
          cropName: cropPlanForm.cropName,
          season: cropPlanForm.season,
          location: cropPlanForm.location,
          sowingDate: cropPlanForm.sowingDate,
        }),
      };

      const method = selectedCropPlanId ? "PUT" : "POST";
      const url = selectedCropPlanId ? `${API_BASE}/api/crop-plans/${selectedCropPlanId}` : `${API_BASE}/api/crop-plans`;
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to save crop plan.");

      if (selectedCropPlanId) {
        setCropPlans((current) => current.map((plan) => (plan._id === selectedCropPlanId ? data.plan : plan)));
        setCropPlanMessage(t("Crop plan updated successfully.", "பயிர் திட்டம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது."));
      } else {
        setCropPlans((current) => [data.plan, ...current]);
        setCropPlanMessage(t("Crop plan created successfully.", "பயிர் திட்டம் வெற்றிகரமாக உருவாக்கப்பட்டது."));
      }
      resetCropPlanForm();
      setSelectedCropPlanId(null);
    } catch (error) {
      setCropPlansError(error.message || t("Unable to save crop plan.", "பயிர் திட்டத்தை சேமிக்க முடியவில்லை."));
    } finally {
      setCropPlanSubmitting(false);
    }
  };

  const handleCropPlanDelete = async (planId) => {
    const confirmDelete = window.confirm(t("Delete this crop plan?", "இந்த பயிர் திட்டத்தை நீக்க விரும்புகிறீர்களா?"));
    if (!confirmDelete) return;

    try {
      const res = await authFetch(`${API_BASE}/api/crop-plans/${planId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to delete crop plan.");
      setCropPlans((current) => current.filter((plan) => plan._id !== planId));
      if (selectedCropPlanId === planId) {
        resetCropPlanForm();
      }
      setCropPlanMessage(t("Crop plan deleted successfully.", "பயிர் திட்டம் வெற்றிகரமாக நீக்கப்பட்டது."));
    } catch (error) {
      setCropPlansError(error.message || t("Unable to delete crop plan.", "பயிர் திட்டத்தை நீக்க முடியவில்லை."));
    }
  };

  const handlePlanTaskToggle = async (planId, taskId, currentStatus) => {
    const nextStatus = currentStatus === "Completed" ? "Upcoming" : "Completed";
    try {
      const res = await authFetch(`${API_BASE}/api/crop-plans/${planId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to update task status.");
      setCropPlans((current) => current.map((plan) => {
        if (plan._id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map((task) => task._id === taskId ? data.task : task),
        };
      }));
    } catch (error) {
      setCropPlansError(error.message || t("Unable to update task status.", "பணியின் நிலையை புதுப்பிக்க முடியவில்லை."));
    }
  };

  const handleAddCustomTask = async (planId) => {
    const title = customTaskForm.title.trim();
    if (!title) {
      setCropPlansError(t("Task name is required.", "பணியின் பெயர் அவசியம்."));
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/api/crop-plans/${planId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date: customTaskForm.date,
          category: customTaskForm.category,
          notes: customTaskForm.notes,
          description: customTaskForm.notes || "Custom farming task",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Unable to add custom task.");
      setCropPlans((current) => current.map((plan) => plan._id === planId ? data.plan : plan));
      setCustomTaskForm({ title: "", date: new Date().toISOString().slice(0, 10), category: "Sowing", notes: "" });
      setCropPlanMessage(t("Custom task added successfully.", "தனிப்பயன் பணி வெற்றிகரமாக சேர்க்கப்பட்டது."));
    } catch (error) {
      setCropPlansError(error.message || t("Unable to add custom task.", "தனிப்பயன் பணியை சேர்க்க முடியவில்லை."));
    }
  };

  const renderCropCalendarPage = () => {
    const selectedPlan = cropPlans.find((plan) => plan._id === selectedCropPlanId) || null;
    const timelineTasks = selectedPlan ? getTimelineTasks(selectedPlan) : createDefaultCropTasks({
      cropName: cropPlanForm.cropName,
      season: cropPlanForm.season,
      location: cropPlanForm.location,
      sowingDate: cropPlanForm.sowingDate,
    });

    return (
      <section className="service-page">
        <div className="service-heading reveal-on-scroll">
          <div>
            <p className="eyebrow">🌱 {t("Crop Calendar", "பயிர் காலண்டர்")}</p>
            <h2>{t("Smart Crop Calendar & Farming Planner", "ஸ்மார்ட் பயிர் காலண்டர் & விவசாய திட்டமிடல்")}</h2>
            <p className="page-intro">{t("Plan your crop activities from sowing to harvesting.", "விதைப்பிலிருந்து அறுவடை வரை உங்கள் பயிர் செயல்பாடுகளை திட்டமிடுங்கள்.")}</p>
          </div>
          <div className="official-seal"><Sprout size={24} /><span>{t("Farming Planner", "விவசாய திட்டமிடல்")}</span></div>
        </div>

        <div className="settings-feature-grid reveal-on-scroll">
          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><CalendarDays size={19} /><h3>{t("Create Crop Plan", "பயிர் திட்டத்தை உருவாக்கவும்")}</h3></div>
            <form onSubmit={handleCropPlanSubmit} className="settings-form">
              <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div><label>{t("Crop", "பயிர்")}</label><select value={cropPlanForm.cropName} onChange={(event) => setCropPlanForm((current) => ({ ...current, cropName: event.target.value }))}><option>Rice</option><option>Maize</option><option>Groundnut</option><option>Cotton</option><option>Tomato</option><option>Onion</option><option>Chilli</option><option>Banana</option><option>Sugarcane</option><option>Coconut</option></select></div>
                <div><label>{t("Variety / Crop Type", "வகை / பயிர் வகை")}</label><input value={cropPlanForm.variety} onChange={(event) => setCropPlanForm((current) => ({ ...current, variety: event.target.value }))} placeholder={t("Short duration / local variety", "குறுகிய கால / உள்ளூர் வகை")} /></div>
                <div><label>{t("Season", "பருவம்")}</label><select value={cropPlanForm.season} onChange={(event) => setCropPlanForm((current) => ({ ...current, season: event.target.value }))}><option>Kharif</option><option>Rabi</option><option>Zaid</option><option>Perennial</option></select></div>
                <div><label>{t("Location", "இடம்")}</label><input value={cropPlanForm.location} onChange={(event) => setCropPlanForm((current) => ({ ...current, location: event.target.value }))} /></div>
                <div><label>{t("Land area (acres)", "நிலப்பரப்பு (ஏக்கர்)")}</label><input type="number" min="0.1" step="0.1" value={cropPlanForm.landArea} onChange={(event) => setCropPlanForm((current) => ({ ...current, landArea: event.target.value }))} /></div>
                <div><label>{t("Expected sowing date", "மதிப்பிடப்பட்ட விதைப்பு தேதி")}</label><input type="date" value={cropPlanForm.sowingDate} onChange={(event) => setCropPlanForm((current) => ({ ...current, sowingDate: event.target.value }))} /></div>
                <div><label>{t("Expected harvest date", "மதிப்பிடப்பட்ட அறுவடை தேதி")}</label><input type="date" value={cropPlanForm.expectedHarvestDate} onChange={(event) => setCropPlanForm((current) => ({ ...current, expectedHarvestDate: event.target.value }))} /></div>
              </div>

              <div className="settings-inline-actions" style={{ marginTop: "16px" }}>
                <button type="submit" className="primary-action" disabled={cropPlanSubmitting}>{cropPlanSubmitting ? t("Saving plan...", "திட்டம் சேமிக்கப்படுகிறது...") : t("Save crop plan", "பயிர் திட்டத்தை சேமிக்கவும்")}</button>
                <button type="button" className="secondary-action" onClick={resetCropPlanForm}>{t("Clear", "அழி")}</button>
              </div>

              {cropPlanMessage && <p className="success-message">{cropPlanMessage}</p>}
              {cropPlansError && <p className="error-message">{cropPlansError}</p>}
            </form>
          </section>

          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><CloudSun size={19} /><h3>{t("Crop Plan Summary", "பயிர் திட்ட சுருக்கம்")}</h3></div>
            <div className="status-strip" style={{ display: "grid", gap: "10px" }}>
              <p><strong>{t("Selected crop", "தேர்ந்தெடுக்கப்பட்ட பயிர்")}:</strong> {cropPlanForm.cropName}</p>
              <p><strong>{t("Sowing date", "விதைப்பு தேதி")}:</strong> {cropPlanForm.sowingDate || t("Not set", "நிர்ணயிக்கப்படவில்லை")}</p>
              <p><strong>{t("Land area", "நிலப்பரப்பு")}:</strong> {cropPlanForm.landArea || "0"} acres</p>
              <p><strong>{t("Location", "இடம்")}:</strong> {cropPlanForm.location || t("Not set", "நிர்ணயிக்கப்படவில்லை")}</p>
              <p><strong>{t("Status", "நிலை")}:</strong> {t("Planning", "திட்டமிடல்")}</p>
              {weather ? <p><strong>{t("Current weather", "தற்போதைய வானிலை")}:</strong> {weather?.weather?.[0]?.description || "N/A"} • {weather?.main?.temp != null ? `${Math.round(weather.main.temp)}°C` : "N/A"}</p> : <p><strong>{t("Weather information temporarily unavailable.", "வானிலை தகவல் தற்காலிகமாக கிடைக்கவில்லை.")}</strong></p>}
            </div>
          </section>
        </div>

        <div className="settings-feature-grid reveal-on-scroll">
          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><CalendarDays size={19} /><h3>{t("Timeline / Calendar", "கால அட்டவணை")}</h3></div>
            {cropPlansLoading ? <p>{t("Loading crop plan...", "பயிர் திட்டம் ஏற்றப்படுகிறது...")}</p> : timelineTasks.length === 0 ? <p>{t("No crop plan created yet. Create your first farming plan.", "இன்னும் பயிர் திட்டம் உருவாக்கப்படவில்லை. உங்கள் முதல் விவசாய திட்டத்தை உருவாக்கவும்.")}</p> : <div style={{ display: "grid", gap: "12px" }}>{timelineTasks.map((task, index) => (
              <div key={`${task.title}-${task.plannedDate || index}`} className="status-strip">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{task.title}</strong>
                  <span className="metric-chip" style={{ padding: "4px 8px", borderRadius: "999px", fontSize: "11px" }}>{task.status || "Upcoming"}</span>
                </div>
                <p><strong>{t("Stage", "நிலை")}:</strong> {task.category || t("Farming Stage", "விவசாய நிலை")}</p>
                <p><strong>{t("Planned date", "திட்டமிடப்பட்ட தேதி")}:</strong> {task.plannedDate ? new Date(task.plannedDate).toLocaleDateString() : t("Not set", "நிர்ணயிக்கப்படவில்லை")}</p>
                <p>{task.description || t("Prepare the field before sowing according to the crop and local recommendations.", "தேர்ந்தெடுக்கப்பட்ட பயிர் மற்றும் உள்ளூர் பரிந்துரைகளுக்கு ஏற்ப விதைப்புக்கு முன் நிலத்தை தயார் செய்யுங்கள்.")}</p>
                {task.notes && <p><strong>{t("Notes", "குறிப்புகள்")}:</strong> {task.notes}</p>}
                {task._id && (
                  <button type="button" className="primary-action" onClick={() => handlePlanTaskToggle(selectedPlan?._id || cropPlans[0]?._id, task._id, task.status)}>
                    {task.status === "Completed" ? t("Mark as Incomplete", "முடிந்ததாக குறிக்காமல் மாற்று") : t("Mark as Completed", "முடிந்ததாக குறி")}
                  </button>
                )}
              </div>
            ))}</div>}
          </section>

          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><Info size={19} /><h3>{t("Farming Planning Insights", "விவசாய திட்டமிடல் நுண்ணறிவு")}</h3></div>
            <ul style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "10px" }}>
              <li>{t("Keep track of upcoming farming activities.", "வரவிருக்கும் விவசாய செயல்பாடுகளை கண்காணிக்கவும்.")}</li>
              <li>{t("Complete overdue tasks before starting the next stage.", "அடுத்த கட்டத்தை தொடங்குவதற்கு முன் காலாவதியான பணிகளை முடிக்கவும்.")}</li>
              <li>{t("Monitor crop health regularly.", "பயிரின் ஆரோக்கியத்தை தவறாமல் கண்காணிக்கவும்.")}</li>
              <li>{t("Consider local weather conditions while planning field activities.", "நிலப்பணிகளை திட்டமிடும்போது உள்ளூர் வானிலை நிலைமைகளைக் கருத்தில் கொள்ளவும்.")}</li>
            </ul>
          </section>
        </div>

        <div className="settings-feature-grid reveal-on-scroll">
          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><Plus size={19} /><h3>{t("Personal Farming Planner", "தனிப்பட்ட விவசாய திட்டமிடல்")}</h3></div>
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
              <div><label>{t("Task name", "பணியின் பெயர்")}</label><input value={customTaskForm.title} onChange={(event) => setCustomTaskForm((current) => ({ ...current, title: event.target.value }))} /></div>
              <div><label>{t("Date", "தேதி")}</label><input type="date" value={customTaskForm.date} onChange={(event) => setCustomTaskForm((current) => ({ ...current, date: event.target.value }))} /></div>
              <div><label>{t("Category", "வகை")}</label><select value={customTaskForm.category} onChange={(event) => setCustomTaskForm((current) => ({ ...current, category: event.target.value }))}><option>Sowing</option><option>Irrigation</option><option>Fertilizer</option><option>Pest Monitoring</option><option>Disease Monitoring</option><option>Weeding</option><option>Harvest</option><option>Other</option></select></div>
              <div style={{ gridColumn: "1 / -1" }}><label>{t("Notes", "குறிப்புகள்")}</label><textarea value={customTaskForm.notes} onChange={(event) => setCustomTaskForm((current) => ({ ...current, notes: event.target.value }))} rows="3" /></div>
            </div>
            <div className="settings-inline-actions" style={{ marginTop: "16px" }}>
              <button type="button" className="primary-action" onClick={() => selectedPlan ? handleAddCustomTask(selectedPlan._id) : setCropPlansError(t("Create a crop plan first.", "முதலில் ஒரு பயிர் திட்டத்தை உருவாக்கவும்."))}>{t("Add Task", "பணியை சேர்க்கவும்")}</button>
            </div>
          </section>

          <section className="settings-panel settings-feature-card">
            <div className="panel-title"><User size={19} /><h3>{t("Saved Crop Plans", "சேமிக்கப்பட்ட பயிர் திட்டங்கள்")}</h3></div>
            {cropPlansLoading ? <p>{t("Loading crop plans...", "பயிர் திட்டங்கள் ஏற்றப்படுகின்றன...")}</p> : cropPlans.length === 0 ? <p>{t("No crop plan created yet. Create your first farming plan.", "இன்னும் பயிர் திட்டம் உருவாக்கப்படவில்லை. உங்கள் முதல் விவசாய திட்டத்தை உருவாக்கவும்.")}</p> : <div style={{ display: "grid", gap: "10px" }}>{cropPlans.map((plan) => (
              <div key={plan._id} className="status-strip">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <strong>{plan.cropName}</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" className="secondary-action" onClick={() => setSelectedCropPlanId(plan._id)}>{t("View", "பார்")}</button>
                    <button type="button" className="secondary-action" onClick={() => {
                      setSelectedCropPlanId(plan._id);
                      setCropPlanForm(normalizePlanForm(plan));
                    }}>{t("Edit", "திருத்து")}</button>
                    <button type="button" className="secondary-action" onClick={() => handleCropPlanDelete(plan._id)}>{t("Delete", "நீக்கு")}</button>
                  </div>
                </div>
                <p>{plan.season} • {plan.location} • {plan.landArea} acres</p>
                <small>{plan.sowingDate ? new Date(plan.sowingDate).toLocaleDateString() : ""}</small>
              </div>
            ))}</div>}
          </section>
        </div>
      </section>
    );
  };

  const renderLandPage = () => (
    <section className="service-page">
      <div className="service-heading reveal-on-scroll">
        <div>
          <p className="eyebrow">🌱 {t("Land & Soil Intelligence", "நிலம் & மண் நுண்ணறிவு")}</p>
          <h2>{t("Land & Soil", "நிலம் & மண்")}</h2>
          <p className="page-intro">{t("Track land profile, soil quality, crop suitability and research-backed guidance for each farm parcel.", "ஒவ்வொரு பண்ணை நிலத்திற்கும் நில விவரம், மண் தரம், பயிர் பொருத்தம் மற்றும் ஆராய்ச்சி அடிப்படையிலான வழிகாட்டுதலைப் பின்பற்றவும்.")}</p>
        </div>
        <div className="official-seal"><Sprout size={24} /><span>{t("Land intelligence", "நில நுண்ணறிவு")}</span></div>
      </div>

      <div className="settings-feature-grid reveal-on-scroll">
        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><MapPin size={19} /><h3>{t("Land Profile", "நில விவரம்")}</h3></div>
          <form onSubmit={handleLandSubmit} className="settings-form">
            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              <div><label>{t("Land Name", "நில பெயர்")}</label><input name="landName" value={landForm.landName} onChange={handleLandChange} placeholder={t("North Farm", "வடக்கு பண்ணை")} /></div>
              <div><label>{t("Village", "ஊர்")}</label><input name="village" value={landForm.village} onChange={handleLandChange} /></div>
              <div><label>{t("District", "மாவட்டம்")}</label><input name="district" value={landForm.district} onChange={handleLandChange} /></div>
              <div><label>{t("State", "மாநிலம்")}</label><input name="state" value={landForm.state} onChange={handleLandChange} /></div>
              <div><label>{t("Survey Number", "சர்வே எண்")}</label><input name="surveyNumber" value={landForm.surveyNumber} onChange={handleLandChange} /></div>
              <div><label>{t("Land Area", "நிலப்பரப்பு")}</label><input type="number" min="0" step="0.01" name="areaValue" value={landForm.areaValue} onChange={handleLandChange} /></div>
              <div><label>{t("Unit", "அலகு")}</label><select name="areaUnit" value={landForm.areaUnit} onChange={handleLandChange}><option>Acre</option><option>Cent</option><option>Hectare</option><option>Square Meter</option><option>Square Feet</option></select></div>
            </div>

            <div className="settings-inline-actions" style={{ marginTop: "16px" }}>
              <button type="submit" className="primary-action" disabled={landLoading}>{landLoading ? t("Saving...", "சேமிக்கப்படுகிறது...") : selectedLandId ? t("Update Land", "நிலத்தை புதுப்பிக்கவும்") : t("Save Land", "நிலத்தை சேமிக்கவும்")}</button>
              <button type="button" className="secondary-action" onClick={resetLandForm}>{t("Clear", "அழி")}</button>
            </div>

            {landMessage && <p className="success-message">{landMessage}</p>}
            {landError && <p className="error-message">{landError}</p>}
          </form>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><ClipboardCheck size={19} /><h3>{t("Area Calculator", "பரப்பளவு கால்குலேட்டர்")}</h3></div>
          {areaConversion ? (
            <div className="status-strip" style={{ display: "grid", gap: "8px" }}>
              <p><strong>{landForm.areaValue} {landForm.areaUnit}</strong></p>
              <p>{t("Equivalent:", "சமமானது:")} <strong>{areaConversion.cent} Cent</strong></p>
              <p>{t("Equivalent:", "சமமானது:")} <strong>{areaConversion.acre} Acre</strong></p>
              <p>{t("Approximate hectare:", "சுமார் ஹெக்டேர்:")} <strong>{areaConversion.hectare} ha</strong></p>
              <p>{t("Square meters:", "சதுர மீட்டர்:")} <strong>{areaConversion.squareMeter} m²</strong></p>
            </div>
          ) : (
            <p className="dashboard-muted">{t("Enter land area to calculate conversion values.", "மாற்று மதிப்புகளை கணக்கிட நிலப்பரப்பை உள்ளிடவும்.")}</p>
          )}
        </section>
      </div>

      <div className="settings-feature-grid reveal-on-scroll">
        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Leaf size={19} /><h3>{t("Nature of Farmer's Land", "விவசாயியின் நிலத்தின் இயல்பு")}</h3></div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div><label>{t("Terrain", "நில அமைப்பு")}</label><select name="terrain" value={landForm.terrain} onChange={handleLandChange}><option>Flat</option><option>Gently Sloping</option><option>Sloping</option><option>Hilly</option></select></div>
            <div><label>{t("Drainage", "நீர் வடிகால்")}</label><select name="drainage" value={landForm.drainage} onChange={handleLandChange}><option>Well Drained</option><option>Moderately Drained</option><option>Poorly Drained</option><option>Waterlogged</option></select></div>
            <div><label>{t("Water Source", "நீர் ஆதாரம்")}</label><select name="waterSource" value={landForm.waterSource} onChange={handleLandChange}><option>Rainfed</option><option>Borewell</option><option>Open Well</option><option>Canal</option><option>River</option><option>Pond</option><option>Multiple Sources</option><option>Other</option></select></div>
            <div><label>{t("Irrigation Availability", "நீர்ப்பாசன கிடைக்கும் தன்மை")}</label><select name="irrigation" value={landForm.irrigation} onChange={handleLandChange}><option>Available</option><option>Partially Available</option><option>Not Available</option></select></div>
            <div><label>{t("Soil Depth", "மண் ஆழம்")}</label><select name="soilDepth" value={landForm.soilDepth} onChange={handleLandChange}><option>Shallow</option><option>Medium</option><option>Deep</option></select></div>
            <div><label>{t("Stoniness", "கல் இருப்பு")}</label><select name="stoniness" value={landForm.stoniness} onChange={handleLandChange}><option>None</option><option>Low</option><option>Moderate</option><option>High</option></select></div>
            <div><label>{t("Land Use", "நில பயன்பாடு")}</label><select name="landUse" value={landForm.landUse} onChange={handleLandChange}><option>Agricultural</option><option>Plantation</option><option>Orchard</option><option>Fallow</option><option>Mixed Farming</option></select></div>
          </div>
          <div className="status-strip" style={{ marginTop: "18px" }}>
            <strong>{t("Land Profile Summary", "நில விவர சுருக்கம்")}</strong>
            <p>{t("Terrain:", "நில அமைப்பு:")} {landForm.terrain}</p>
            <p>{t("Drainage:", "வடிகால்:")} {landForm.drainage}</p>
            <p>{t("Water Source:", "நீர் ஆதாரம்:")} {landForm.waterSource}</p>
            <p>{t("Soil Depth:", "மண் ஆழம்:")} {landForm.soilDepth}</p>
            <p>{t("Overall Interpretation:", "மொத்த விளக்கம்:")} {t("The recorded land has", "பதிவுசெய்யப்பட்ட நிலம்")} {landForm.terrain.toLowerCase()} {t("terrain,", "நில அமைப்பு,")} {landForm.soilDepth.toLowerCase()} {t("soil and", "மண் மற்றும்")} {landForm.drainage.toLowerCase()} {t("drainage. These characteristics may support a range of agricultural uses, but actual crop suitability should also consider soil test results, water availability and climate.", "வடிகால் கொண்டது. இந்த பண்புகள் பல்வேறு விவசாய பயன்பாடுகளுக்கு பரிந்துரைக்கலாம், ஆனால் உண்மையான பயிர் பொருத்தம் மண் சோதனை முடிவுகள், நீர் கிடைக்கும் தன்மை மற்றும் பருவநிலையைப் பொறுத்து மதிப்பீடு செய்யப்பட வேண்டும்.")}</p>
          </div>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><FlaskConical size={19} /><h3>{t("Soil Profile", "மண் விவரம்")}</h3></div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
            <div><label>{t("Soil Type", "மண் வகை")}</label><select name="soilType" value={landForm.soilType} onChange={handleLandChange}><option>Sandy</option><option>Sandy Loam</option><option>Loam</option><option>Clay Loam</option><option>Clay</option><option>Red Soil</option><option>Black Soil</option><option>Alluvial Soil</option><option>Laterite Soil</option><option>Other</option></select></div>
            <div><label>{t("Soil pH", "மண் pH")}</label><input type="number" min="0" max="14" step="0.1" name="soilPh" value={landForm.soilPh} onChange={handleLandChange} /></div>
            <div><label>{t("EC – Electrical Conductivity", "EC – மின் கடத்துத்திறன்")}</label><input type="number" step="0.01" name="ecValue" value={landForm.ecValue} onChange={handleLandChange} /></div>
            <div><label>{t("EC Unit", "EC அலகு")}</label><input name="ecUnit" value={landForm.ecUnit} onChange={handleLandChange} /></div>
            <div><label>{t("Organic Carbon (%)", "கரிம கார்பன் (%)")}</label><input type="number" step="0.01" name="organicCarbon" value={landForm.organicCarbon} onChange={handleLandChange} /></div>
          </div>
          <div className="status-strip" style={{ marginTop: "16px" }}>
            <p><strong>{t("pH Interpretation:", "pH விளக்கம்:")}</strong> {soilPhSummary}</p>
            <p>{t("Organic carbon is an important indicator related to soil organic matter and soil quality.", "கரிம கார்பன் என்பது மண் கரிமப் பொருள் மற்றும் மண் தரத்துடன் தொடர்புடைய ஒரு முக்கிய குறிகாட்டியாகும்.")}</p>
          </div>
        </section>
      </div>

      <div className="settings-feature-grid reveal-on-scroll">
        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Leaf size={19} /><h3>{t("Soil Health Summary", "மண் சுகாதார சுருக்கம்")}</h3></div>
          <div className="status-strip" style={{ display: "grid", gap: "8px" }}>
            <p>{t("pH:", "pH:")} {landForm.soilPh || t("Not available", "கிடைக்கவில்லை")}</p>
            <p>{t("EC:", "EC:")} {landForm.ecValue || t("Not available", "கிடைக்கவில்லை")} {landForm.ecUnit || ""}</p>
            <p>{t("Organic Carbon:", "கரிம கார்பன்:")} {landForm.organicCarbon || t("Not available", "கிடைக்கவில்லை")}%</p>
            <p>{t("N:", "N:")} {landForm.nitrogenValue || t("Not available", "கிடைக்கவில்லை")} {landForm.nitrogenUnit || ""}</p>
            <p>{t("P:", "P:")} {landForm.phosphorusValue || t("Not available", "கிடைக்கவில்லை")} {landForm.phosphorusUnit || ""}</p>
            <p>{t("K:", "K:")} {landForm.potassiumValue || t("Not available", "கிடைக்கவில்லை")} {landForm.potassiumUnit || ""}</p>
            <p>{t("Micronutrients:", "மைக்ரோநியூட்ரியன்ட்கள்:")} {t("Available / Needs Attention / Not Available", "கிடைக்கிறது / கவனம் தேவை / கிடைக்கவில்லை")}</p>
          </div>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Sprout size={19} /><h3>{t("Crop Suitability", "பயிர் பொருத்தம்")}</h3></div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <div><label>{t("Select Crop", "பயிரைத் தேர்ந்தெடுக்கவும்")}</label><select name="currentCrop" value={landForm.currentCrop} onChange={handleLandChange}><option value="">--</option><option>Rice</option><option>Wheat</option><option>Maize</option><option>Tomato</option><option>Groundnut</option><option>Cotton</option><option>Banana</option><option>Coconut</option><option>Sugarcane</option><option>Millets</option><option>Pulses</option><option>Other</option></select></div>
            <div><label>{t("Previous Crop", "முந்தைய பயிர்")}</label><input name="previousCrop" value={landForm.previousCrop} onChange={handleLandChange} /></div>
            <div><label>{t("Season", "பருவம்")}</label><input name="season" value={landForm.season} onChange={handleLandChange} /></div>
            <div><label>{t("Year", "வருடம்")}</label><input type="number" name="year" value={landForm.year} onChange={handleLandChange} /></div>
          </div>
          <div className="status-strip" style={{ marginTop: "16px" }}>
            <p><strong>{t("Crop:", "பயிர்:")}</strong> {landForm.currentCrop || t("Not selected", "தேர்ந்தெடுக்கப்படவில்லை")}</p>
            <p><strong>{t("Soil:", "மண்:")}</strong> {landForm.soilType}</p>
            <p><strong>{t("Assessment:", "மதிப்பீடு:")}</strong> {t("The recorded land characteristics appear broadly compatible with the selected crop, subject to local climate, soil-test results and management practices.", "பதிவுசெய்யப்பட்ட நில பண்புகள் தேர்ந்தெடுக்கப்பட்ட பயிருக்கு பரந்த அளவில் பொருந்தக்கூடியதாக தோன்றுகிறது; இருப்பினும் உள்ளூர் பருவநிலை, மண் சோதனை முடிவுகள் மற்றும் மேலாண்மை நடைமுறைகள் அவசியம்.")}</p>
          </div>
        </section>
      </div>

      <div className="settings-feature-grid reveal-on-scroll">
        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><ClipboardCheck size={19} /><h3>{t("Nutrient Data", "சத்துக் தரவு")}</h3></div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            {[
              ['nitrogen', 'Nitrogen (N)'],
              ['phosphorus', 'Phosphorus (P)'],
              ['potassium', 'Potassium (K)'],
              ['sulfur', 'Sulphur (S)'],
              ['zinc', 'Zinc (Zn)'],
              ['iron', 'Iron (Fe)'],
              ['copper', 'Copper (Cu)'],
              ['manganese', 'Manganese (Mn)'],
              ['boron', 'Boron (B)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label>{label}</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="number" step="0.01" value={landForm[`${key}Value`]} onChange={(e) => setLandForm({ ...landForm, [`${key}Value`]: e.target.value })} />
                  <input value={landForm[`${key}Unit`]} onChange={(e) => setLandForm({ ...landForm, [`${key}Unit`]: e.target.value })} placeholder="unit" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Bot size={19} /><h3>{t("AI Land Insight", "AI நில நுண்ணறிவு")}</h3></div>
          <button type="button" className="primary-action" onClick={analyzeLand} disabled={landAnalysisLoading}>{landAnalysisLoading ? t("Analyzing...", "பகுப்பாய்வு செய்கிறது...") : t("Analyze My Land", "எனது நிலத்தை பகுப்பாய்வு செய்க")}</button>
          {landAnalysis && (
            <div className="status-strip" style={{ marginTop: "14px" }}>
              <p><strong>{t("Land Summary", "நில சுருக்கம்")}</strong>: {landAnalysis.landSummary}</p>
              <p><strong>{t("Soil Interpretation", "மண் விளக்கம்")}</strong>: {landAnalysis.soilInterpretation}</p>
              <p><strong>{t("Possible Suitable Crops", "சாத்தியமான பயிர்கள்")}</strong>: {landAnalysis.possibleSuitableCrops}</p>
              <p><strong>{t("Soil Management Considerations", "மண் மேலாண்மை கருத்துக்கள்")}</strong>: {landAnalysis.soilManagementConsiderations}</p>
              <p><strong>{t("Water Considerations", "நீர் கருத்துக்கள்")}</strong>: {landAnalysis.waterConsiderations}</p>
              <p><strong>{t("Risks / Limitations", "ஆபத்துகள் / வரம்புகள்")}</strong>: {landAnalysis.risksLimitations}</p>
              <p><strong>{t("Recommended Next Steps", "முன்னுரிமை அடுத்த படிகள்")}</strong>: {landAnalysis.recommendedNextSteps}</p>
            </div>
          )}
        </section>
      </div>

      <div className="settings-feature-grid reveal-on-scroll">
        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><CalendarDays size={19} /><h3>{t("Smart Crop Calendar", "ஸ்மார்ட் பயிர் காலண்டர்")}</h3></div>
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            <div>
              <label>{t("Crop", "பயிர்")}</label>
              <select value={cropPlannerForm.crop} onChange={(event) => setCropPlannerForm((current) => ({ ...current, crop: event.target.value }))}>
                <option>Rice</option>
                <option>Wheat</option>
                <option>Maize</option>
                <option>Tomato</option>
                <option>Cotton</option>
                <option>Banana</option>
              </select>
            </div>
            <div>
              <label>{t("Season", "பருவம்")}</label>
              <select value={cropPlannerForm.season} onChange={(event) => setCropPlannerForm((current) => ({ ...current, season: event.target.value }))}>
                <option>Kharif</option>
                <option>Rabi</option>
                <option>Zaid</option>
                <option>Perennial</option>
              </select>
            </div>
            <div>
              <label>{t("Planting date", "விதைப்பு தேதி")}</label>
              <input type="date" value={cropPlannerForm.plantingDate} onChange={(event) => setCropPlannerForm((current) => ({ ...current, plantingDate: event.target.value }))} />
            </div>
            <div>
              <label>{t("Water availability", "நீர் கிடைக்கும் தன்மை")}</label>
              <select value={cropPlannerForm.waterAvailability} onChange={(event) => setCropPlannerForm((current) => ({ ...current, waterAvailability: event.target.value }))}>
                <option>Adequate</option>
                <option>Limited</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label>{t("Soil type", "மண் வகை")}</label>
              <select value={cropPlannerForm.soilType} onChange={(event) => setCropPlannerForm((current) => ({ ...current, soilType: event.target.value }))}>
                <option>Sandy Loam</option>
                <option>Loam</option>
                <option>Clay Loam</option>
                <option>Clay</option>
                <option>Black Soil</option>
                <option>Red Soil</option>
              </select>
            </div>
            <div>
              <label>{t("Location", "இடம்")}</label>
              <input value={cropPlannerForm.location} onChange={(event) => setCropPlannerForm((current) => ({ ...current, location: event.target.value }))} />
            </div>
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
            {cropPlannerCalendar.map((item) => (
              <div key={`${item.stage}-${item.date}`} className="status-strip">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <strong>{item.stage}</strong>
                  <span>{item.date}</span>
                </div>
                <p>{item.advice}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Search size={19} /><h3>{t("Search Agricultural Research", "வேளாண் ஆராய்ச்சியை தேடுங்கள்")}</h3></div>
          <input value={researchQuery} onChange={(e) => setResearchQuery(e.target.value)} placeholder={t("Crop, Soil, Agriculture, Water Management", "பயிர், மண், விவசாயம், நீர் மேலாண்மை")} />
          <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            {filteredResearch.map((item) => (
              <div key={item.id} className="status-strip">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <strong>{item.title}</strong>
                  <button type="button" className="secondary-action" onClick={() => saveResearch(item)}>{savedResearch.some((saved) => saved.id === item.id) ? t("Saved", "சேமிக்கப்பட்டது") : t("Save", "சேமி")}</button>
                </div>
                <p><strong>{t("Source", "மூலம்")}:</strong> {item.source}</p>
                <p><strong>{t("Category", "வகை")}:</strong> {item.category}</p>
                <p><strong>{t("Type", "வகை")}:</strong> {item.type}</p>
                <p>{item.description}</p>
                <p><strong>{t("Year", "வருடம்")}:</strong> {item.year}</p>
                <a href={item.url} target="_blank" rel="noreferrer">{t("Read Research", "ஆராய்ச்சியைப் படிக்கவும்")}</a>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-panel settings-feature-card">
          <div className="panel-title"><Star size={19} /><h3>{t("My Research", "எனது ஆராய்ச்சி")}</h3></div>
          {savedResearch.length === 0 ? <p>{t("No saved research yet.", "இதுவரை சேமிக்கப்பட்ட ஆராய்ச்சி இல்லை.")}</p> : savedResearch.map((item) => (
            <div key={item.id} className="status-strip" style={{ marginBottom: "12px" }}>
              <strong>{item.title}</strong>
              <p>{item.source} • {item.category}</p>
              <a href={item.url} target="_blank" rel="noreferrer">{t("Open resource", "வளத்தை திறக்கவும்")}</a>
            </div>
          ))}
        </section>
      </div>

      <section className="settings-panel settings-feature-card reveal-on-scroll">
        <div className="panel-title"><User size={19} /><h3>{t("My Lands", "எனது நிலங்கள்")}</h3></div>
        {landLoading ? <p>{t("Loading land records...", "நில பதிவுகள் ஏற்றப்படுகின்றன...")}</p> : landRecords.length === 0 ? <p>{t("No land records available yet.", "இன்னும் நில பதிவுகள் இல்லை.")}</p> : <div className="status-strip" style={{ display: "grid", gap: "10px" }}>
          {landRecords.map((land) => (
            <div key={land._id} style={{ border: "1px solid #dfe9df", borderRadius: "12px", padding: "12px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <strong>{land.landName || t("Unnamed land", "பெயரிடப்படாத நிலம்")}</strong>
                <p>{land.village || "N/A"} • {land.district || "N/A"}</p>
                <p>{land.areaValue || "0"} {land.areaUnit || "Acre"} • {land.soilType || t("Soil type not entered", "மண் வகை குறிப்பிடப்படவில்லை")}</p>
                <small>{land.currentCrop || t("Crop not entered", "பயிர் குறிப்பிடப்படவில்லை")}</small>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button type="button" className="secondary-action" onClick={() => editLand(land)}>{t("Edit", "திருத்து")}</button>
                <button type="button" className="secondary-action" onClick={() => deleteLand(land._id)}>{t("Delete", "நீக்கு")}</button>
              </div>
            </div>
          ))}
        </div>}
      </section>
    </section>
  );

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "radial-gradient(circle at top, #f4ffeb 0%, #eaf7df 32%, #edf6f0 100%)",
          fontFamily: "Segoe UI, Arial, sans-serif",
          padding: "32px 20px",
        }}
      >
        <div
          style={{
            margin: "auto",
            width: "100%",
            maxWidth: "520px",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.96)",
              borderRadius: "28px",
              padding: "28px 28px 24px",
              boxShadow: "0 26px 80px rgba(54, 92, 44, 0.18)",
              border: "1px solid rgba(104, 158, 92, 0.18)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#edf8ea",
                border: "1px solid #d2ead0",
                borderRadius: "999px",
                padding: "7px 12px",
                color: "#2a6a2c",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "18px",
              }}
            >
              Smart Farmer Start
            </div>

            <h1 style={{ color: "#1b5e20", margin: "0 0 10px", fontSize: "34px", lineHeight: 1.15 }}>
              HAKGROS UZHAVAN
            </h1>

            <p style={{ color: "#3d5f3d", margin: "0 0 8px", fontWeight: 700, fontSize: "18px" }}>
              {t("Welcome to HAKGROS UZHAVAN", "HAKGROS UZHAVANக்கு வரவேற்கிறோம்")}
            </p>

            <p style={{ color: "#5f6a5d", margin: "0 0 24px", lineHeight: 1.6 }}>
              {t(
                "Start your farm profile in seconds and access smart crop, soil, weather, and advisory tools.",
                "சில நொடிகளில் உங்கள் பண்ணை விவரத்தை தொடங்குங்கள்; ஸ்மார்ட் பயிர், மண், வானிலை மற்றும் ஆலோசனை கருவிகளை அணுகலாம்."
              )}
            </p>

            {authError && (
              <div
                style={{
                  background: "#fdecea",
                  color: "#611a15",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                  border: "1px solid #f4c6c2",
                }}
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              <div style={{ display: "grid", gap: "18px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#2d4b2d", fontWeight: 700 }}>
                    {t("Farmer Name", "விவசாயியின் பெயர்")}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    placeholder={t("e.g. K. Rajan", "உ.ம். க. ராஜன்")}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cfe1cd",
                      background: "#f9fbf8",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#2d4b2d", fontWeight: 700 }}>
                    {t("Place / Village", "இடம் / ஊர்")}
                  </label>
                  <input
                    type="text"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder={t("e.g. Coimbatore", "உ.ம். கோயம்புத்தூர்")}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cfe1cd",
                      background: "#f9fbf8",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#2d4b2d", fontWeight: 700 }}>
                    {t("Land Area (acres)", "நிலப்பரப்பு (ஏக்கர்)")}
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder={t("e.g. 2.5", "உ.ம். 2.5")}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 14px",
                      borderRadius: "12px",
                      border: "1px solid #cfe1cd",
                      background: "#f9fbf8",
                      fontSize: "15px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  marginTop: "24px",
                  background: "linear-gradient(135deg, #2e7d32 0%, #4c9a4d 100%)",
                  color: "white",
                  border: "none",
                  padding: "15px 18px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                  boxShadow: "0 12px 24px rgba(46,125,50,0.22)",
                }}
              >
                {t("Get Started", "தொடங்குங்கள்")}
              </button>
            </form>

            <div
              style={{
                marginTop: "18px",
                paddingTop: "18px",
                borderTop: "1px solid #e9efe8",
                color: "#60705f",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {t("Your farm profile stays local on this device.", "உங்கள் பண்ணை விவரம் இந்த சாதனத்தில் மட்டும் சேமிக்கப்படும்.")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${settings.highContrast ? "high-contrast" : ""} theme-${theme}`}
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme === "dark" ? "linear-gradient(135deg, #17231b 0%, #223326 55%, #30452f 100%)" : "linear-gradient(135deg, #B9D175 0%, #D8E7A2 35%, #E8F0C5 100%)",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      {/* ================= SIDEBAR ================= */}
      <div
        className="sidebar-panel"
        style={{
          width: "260px",
          background: "linear-gradient(180deg, #5B7E3C 0%, #6D8F4C 100%)",
          color: "white",
          padding: "24px 18px",
          boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        }}
      >
        <h2 style={{ marginBottom: "12px", fontSize: "24px" }}>🌾 HAKGROS</h2>

        <hr />

        <MenuItem
          title={`🏠 ${t("Dashboard", "டாஷ்போர்டு")}`}
          onClick={() => setActivePage("dashboard")}
        />

        <MenuItem
          title={`👨‍🌾 ${t("Farmers", "விவசாயிகள்")}`}
          onClick={() => setActivePage("farmers")}
        />

        <MenuItem
          title={`🌱 ${t("Crop Calendar", "பயிர் காலண்டர்")}`}
          onClick={() => setActivePage("crop-calendar")}
        />

        <MenuItem
          title={`🌾 ${t("Land & Soil", "நிலம் & மண்")}`}
          onClick={() => setActivePage("land")}
        />

        <MenuItem
          title={`🌤 ${t("Weather", "வானிலை")}`}
          onClick={() => setActivePage("weather")}
        />

        <MenuItem
          title={`📈 ${t("Market Prices", "சந்தை விலை")}`}
          onClick={() => setActivePage("market")}
        />

        <MenuItem
          title={`🧠 ${t("AI Advisory", "கணினி ஆலோசனை")}`}
          onClick={() => setActivePage("advisory")}
        />

        <MenuItem
          title={`📸 ${t("Disease Detection", "வியாதி கண்டறிதல்")}`}
          onClick={() => setActivePage("disease")}
        />

        <MenuItem
          title={`⚙ ${t("Settings", "மைதானம்")}`}
          onClick={() => setActivePage("settings")}
        />
      </div>

      {/* ================= MAIN CONTENT ================= */}

      <div
        style={{
          flex: 1,
          padding: "30px",
        }}
      >
        {/* ================= NAVBAR ================= */}

        <div
          className="topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            background: "rgba(255,255,255,0.75)",
            padding: "16px 20px",
            borderRadius: "16px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="reveal-on-scroll"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <Menu
              size={30}
              style={{
                cursor: "pointer",
              }}
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            />

            <h1
              style={{
                color: "#1b5e20",
              }}
            >
              HAKGROS UZHAVAN
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {user && (
              <span style={{ color: "#1b5e20", fontWeight: 700 }}>
                {user.name || user.email || "Farmer"}
              </span>
            )}
            <button
              onClick={toggleLanguage}
              style={{
                background: "linear-gradient(135deg, #5B7E3C 0%, #718F4F 100%)",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "10px",
                cursor: "pointer",
              }}
            >
              <Globe size={18} />

              {language === "en"
                ? " தமிழ்"
                : " English"}
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "#fff",
                color: "#1b5e20",
                border: "1px solid #b9d9bc",
                padding: "10px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* ================= DASHBOARD ================= */}

        {activePage === "dashboard" && (
          <section className="dashboard-page">
            <div className="dashboard-welcome reveal-on-scroll">
              <div>
                <span className="dashboard-kicker">{t("SMART AGRICULTURE CONTROL CENTER", "ஸ்மார்ட் விவசாய கட்டுப்பாட்டு மையம்")}</span>
                <h2>🌾 {t("Welcome back", "மீண்டும் வரவேற்கிறோம்")}, {user?.name || t("Farmer", "விவசாயி")}</h2>
                <p>{t("Your smart farming assistant is ready to help you today.", "உங்கள் ஸ்மார்ட் விவசாய உதவியாளர் இன்று உங்களுக்கு உதவ தயாராக உள்ளது.")}</p>
                <div className="dashboard-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                  {[
                    t("Weather", "வானிலை"),
                    t("Soil Health", "மண் ஆரோக்கியம்"),
                    t("AI Advice", "AI ஆலோசனை"),
                    t("Market Watch", "சந்தை கண்காணிப்பு")
                  ].map((chip) => (
                    <span key={chip} className="metric-chip" style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 10px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.14)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#eef8d1",
                      fontWeight: 700,
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <button className="dashboard-primary-action" onClick={() => setActivePage("advisory")}><Bot size={18} />{t("Ask AI", "AI-யிடம் கேளுங்கள்")}</button>
            </div>

            <div className="dashboard-stat-grid reveal-on-scroll">
              <button className="dashboard-stat-card" onClick={() => setActivePage("farmers")}><span className="stat-icon"><User size={21} /></span><span><small>{t("Total farmers", "மொத்த விவசாயிகள்")}</small><strong>{farmersLoading ? "..." : (analytics.totalFarmers ?? farmers.length ?? "N/A")}</strong></span><ArrowRight size={17} /></button>
              <button className="dashboard-stat-card" onClick={() => setActivePage("weather")}><span className="stat-icon"><CloudSun size={21} /></span><span><small>{t("Current weather", "தற்போதைய வானிலை")}</small><strong>{weatherLoading ? "..." : weather?.main?.temp != null ? `${Math.round(weather.main.temp)}°C` : "N/A"}</strong></span><ArrowRight size={17} /></button>
              <button className="dashboard-stat-card" onClick={() => setActivePage("market")}><span className="stat-icon"><TrendingUp size={21} /></span><span><small>{t("Market price", "சந்தை விலை")}</small><strong>{marketLoading ? "..." : marketPrices[0]?.price || "N/A"}</strong></span><ArrowRight size={17} /></button>
              <button className="dashboard-stat-card" onClick={() => setActivePage("advisory")}><span className="stat-icon"><Bot size={21} /></span><span><small>{t("AI assistant", "AI உதவியாளர்")}</small><strong>{t("Ready", "தயார்")}</strong></span><ArrowRight size={17} /></button>
            </div>

            <div className="dashboard-main-grid">
              <section className="dashboard-panel weather-dashboard-card reveal-on-scroll">
                <div className="dashboard-panel-heading"><div><span className="dashboard-label"><CloudSun size={16} />{t("Weather overview", "வானிலை சுருக்கம்")}</span><h3>{weather?.name || "Coimbatore"}</h3></div><button className="icon-action" onClick={fetchWeather} title={t("Refresh weather", "வானிலையை புதுப்பிக்கவும்")}><RefreshCw size={17} /></button></div>
                {weatherLoading ? <p className="dashboard-muted">{t("Loading weather...", "வானிலை ஏற்றப்படுகிறது...")}</p> : weatherError || !weather ? <p className="dashboard-muted">{t("Weather information unavailable", "வானிலை தகவல் கிடைக்கவில்லை")}</p> : <div className="weather-dashboard-content"><div className="weather-temperature"><span>{getWeatherIcon(weather.weather?.[0]?.icon)}</span><strong>{weather.main?.temp != null ? `${Math.round(weather.main.temp)}°C` : "N/A"}</strong><small>{weather.weather?.[0]?.description || t("Condition unavailable", "நிலை கிடைக்கவில்லை")}</small></div><div className="weather-facts"><p><span>{t("Humidity", "ஈரப்பதம்")}</span><strong>{weather.main?.humidity != null ? `${weather.main.humidity}%` : "N/A"}</strong></p><p><span>{t("Wind", "காற்று")}</span><strong>{weather.wind?.speed != null ? `${weather.wind.speed} m/s` : "N/A"}</strong></p><p><span>{t("Location", "இடம்")}</span><strong>{weather.name || "N/A"}</strong></p></div></div>}
              </section>

              <section className="dashboard-panel market-dashboard-card reveal-on-scroll">
                <div className="dashboard-panel-heading"><div><span className="dashboard-label"><TrendingUp size={16} />{t("Market prices", "சந்தை விலைகள்")}</span><h3>{t("Latest available feed", "சமீபத்திய தரவு")}</h3></div><button className="text-action" onClick={() => setActivePage("market")}>{t("View all", "அனைத்தையும் காண்க")} <ArrowRight size={15} /></button></div>
                {marketLoading ? <p className="dashboard-muted">{t("Loading market prices...", "சந்தை விலைகள் ஏற்றப்படுகின்றன...")}</p> : marketError ? <p className="dashboard-muted">{marketError}</p> : marketPrices.length === 0 ? <p className="dashboard-muted">{t("No market data available", "சந்தை தரவு கிடைக்கவில்லை")}</p> : <div className="market-mini-list">{marketPrices.slice(0, 3).map((item, index) => <div className="market-mini-row" key={`${item.crop || "crop"}-${index}`}><span><strong>{item.crop || t("Commodity", "பொருள்")}</strong><small>{item.market || item.source || t("Market feed", "சந்தை தரவு")}</small></span><b>{item.price || "N/A"}</b></div>)}</div>}
              </section>
            </div>

            <div className="dashboard-tools-grid reveal-on-scroll">
              <article className="dashboard-tool-card ai-tool-card"><Bot size={25} /><div><h3>{t("AI Farming Assistant", "AI விவசாய உதவியாளர்")}</h3><p>{t("Get intelligent farming advice based on your crop, soil, weather and farming conditions.", "உங்கள் பயிர், மண், வானிலை மற்றும் விவசாய நிலைமைகளின் அடிப்படையில் புத்திசாலித்தனமான ஆலோசனையைப் பெறுங்கள்.")}</p><button onClick={() => setActivePage("advisory")}>{t("Ask AI", "AI-யிடம் கேளுங்கள்")} <ArrowRight size={15} /></button></div></article>
              <article className="dashboard-tool-card disease-tool-card"><Stethoscope size={25} /><div><h3>{t("Crop Disease Detection", "பயிர் நோய் கண்டறிதல்")}</h3><p>{t("Upload a crop image to identify possible diseases and receive recommendations.", "பயிர் படத்தைப் பதிவேற்றி சாத்தியமான நோய்களை கண்டறிந்து பரிந்துரைகளைப் பெறுங்கள்.")}</p><button onClick={() => setActivePage("disease")}>{t("Detect disease", "நோயைக் கண்டறியவும்")} <ArrowRight size={15} /></button></div></article>
            </div>

            <div className="dashboard-bottom-grid">
              <section className="dashboard-panel farmer-overview-panel reveal-on-scroll"><div className="dashboard-panel-heading"><div><span className="dashboard-label"><User size={16} />{t("Recent farmers", "சமீபத்திய விவசாயிகள்")}</span><h3>{t("Farmer management overview", "விவசாயி மேலாண்மை சுருக்கம்")}</h3></div><button className="text-action" onClick={() => setActivePage("farmers")}>{t("Manage", "மேலாண்மை")} <ArrowRight size={15} /></button></div>{farmersLoading ? <p className="dashboard-muted">{t("Loading farmer data...", "விவசாயி தரவு ஏற்றப்படுகிறது...")}</p> : farmersError ? <p className="dashboard-muted">{farmersError}</p> : farmers.length === 0 ? <p className="dashboard-muted">{t("No farmer data available", "விவசாயி தரவு கிடைக்கவில்லை")}</p> : <div className="farmer-mini-list">{farmers.slice(-4).reverse().map((farmer) => <div className="farmer-mini-row" key={farmer._id || farmer.id || farmer.name}><span className="farmer-avatar">{(farmer.name || "F").charAt(0).toUpperCase()}</span><span><strong>{farmer.name || "N/A"}</strong><small>{farmer.village || t("Location unavailable", "இடம் கிடைக்கவில்லை")} · {farmer.cropType || "N/A"}</small></span><em>{t("Active", "செயலில்")}</em></div>)}</div>}</section>
              <section className="dashboard-panel quick-actions-panel reveal-on-scroll"><div className="dashboard-panel-heading"><div><span className="dashboard-label"><Plus size={16} />{t("Quick actions", "விரைவு செயல்கள்")}</span><h3>{t("What would you like to do?", "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?")}</h3></div></div><div className="quick-action-grid"><button onClick={() => setActivePage("farmers")}><Plus size={17} />{t("Add farmer", "விவசாயியைச் சேர்க்கவும்")}</button><button onClick={() => setActivePage("weather")}><CloudSun size={17} />{t("Check weather", "வானிலையைப் பார்க்கவும்")}</button><button onClick={() => setActivePage("market")}><TrendingUp size={17} />{t("Market prices", "சந்தை விலைகள்")}</button><button onClick={() => setActivePage("settings")}><Settings size={17} />{t("Settings", "அமைப்புகள்")}</button></div></section>
            </div>

            <section className="dashboard-insight reveal-on-scroll"><div><span className="dashboard-label"><Leaf size={16} />{t("Smart farming insight", "ஸ்மார்ட் விவசாய பார்வை")}</span><h3>{weather && marketPrices.length ? t("Your live farm signals are available.", "உங்கள் நேரடி பண்ணைத் தகவல்கள் கிடைக்கின்றன.") : t("More farming data is required for detailed insights.", "விரிவான பார்வைக்கு மேலும் விவசாயத் தரவு தேவை.")}</h3><p>{weather && marketPrices[0] ? `${t("Current conditions", "தற்போதைய நிலை")}: ${weather.weather?.[0]?.description || t("weather available", "வானிலை கிடைக்கிறது")}. ${marketPrices[0].crop || t("Market", "சந்தை")}: ${marketPrices[0].price || "N/A"}.` : t("Use the weather, market and AI tools to build a clearer picture of your farm.", "உங்கள் பண்ணையைப் பற்றி தெளிவான பார்வையை உருவாக்க வானிலை, சந்தை மற்றும் AI கருவிகளைப் பயன்படுத்தவும்.")}</p></div><button className="text-action" onClick={() => setActivePage("advisory")}>{t("Get guidance", "ஆலோசனை பெறுங்கள்")} <ArrowRight size={15} /></button></section>
          </section>
        )}

        {/* ================= FARMERS ================= */}

        {activePage === "crop-calendar" && renderCropCalendarPage()}

        {activePage === "land" && renderLandPage()}

        {activePage === "farmers" && (
          <div className="farmer-management">
            <div className="farmer-header reveal-on-scroll">
              <div>
                <span className="dashboard-label"><User size={16} />{t("Farmer Management", "விவசாயி மேலாண்மை")}</span>
                <h2>{t("Farmer Management", "விவசாயி மேலாண்மை")}</h2>
              </div>
            </div>

            <div className="farmer-stat-grid reveal-on-scroll">
              <div className="farmer-stat-card">
                <div className="stat-icon"><User size={20} /></div>
                <div>
                  <small>{t("Total Farmers", "மொத்த விவசாயிகள்")}</small>
                  <strong>{farmerStats.totalFarmers}</strong>
                </div>
              </div>
              <div className="farmer-stat-card">
                <div className="stat-icon"><Plus size={20} /></div>
                <div>
                  <small>{t("Recently Added", "சமீபத்தில் சேர்க்கப்பட்டது")}</small>
                  <strong>{farmerStats.recentAdded}</strong>
                </div>
              </div>
              <div className="farmer-stat-card">
                <div className="stat-icon"><MapPin size={20} /></div>
                <div>
                  <small>{t("Locations", "இடங்கள்")}</small>
                  <strong>{farmerStats.locations}</strong>
                </div>
              </div>
              <div className="farmer-stat-card">
                <div className="stat-icon"><ClipboardCheck size={20} /></div>
                <div>
                  <small>{t("Records", "பதிவுகள்")}</small>
                  <strong>{farmerStats.records}</strong>
                </div>
              </div>
            </div>

            <div className="farmer-layout reveal-on-scroll">
              <section className="farmer-form-panel">
                <h3>{editingId ? t("Update Farmer", "விவசாயியை புதுப்பிக்கவும்") : t("Add Farmer", "விவசாயியைச் சேர்க்கவும்")}</h3>

                <form onSubmit={handleSubmit} className="farmer-form">
                  <div className="farmer-form-grid">
                    <div className="form-field">
                      <label>{t("Farmer Name", "விவசாயியின் பெயர்")}</label>
                      <input
                        type="text"
                        name="name"
                        placeholder={t("Enter farmer name", "விவசாயியின் பெயரை உள்ளிடவும்")}
                        value={formData.name}
                        onChange={handleChange}
                        aria-label={t("Farmer name", "விவசாயியின் பெயர்")}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("Village", "ஊர்")}</label>
                      <input
                        type="text"
                        name="village"
                        placeholder={t("Enter village name", "ஊர் பெயரை உள்ளிடவும்")}
                        value={formData.village}
                        onChange={handleChange}
                        aria-label={t("Village", "ஊர்")}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("Crop Type", "பயிர் வகை")}</label>
                      <input
                        type="text"
                        name="cropType"
                        placeholder={t("Enter primary crop", "முதன்மை பயிரை உள்ளிடவும்")}
                        value={formData.cropType}
                        onChange={handleChange}
                        aria-label={t("Crop type", "பயிர் வகை")}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("Land Area (acres)", "நிலப்பரப்பு (ஏக்கர்)")}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        name="landSize"
                        placeholder={t("Enter land area", "நிலப்பரப்பை உள்ளிடவும்")}
                        value={formData.landSize}
                        onChange={handleChange}
                        aria-label={t("Land area", "நிலப்பரப்பு")}
                      />
                    </div>
                  </div>

                  {(farmerError || farmerMessage) && (
                    <div className={farmerError ? "farmer-alert error" : "farmer-alert success"}>
                      {farmerError || farmerMessage}
                    </div>
                  )}

                  <div className="farmer-form-actions">
                    <button type="submit" className="primary-action" disabled={farmerSubmitting}>
                      {farmerSubmitting
                        ? t("Saving...", "சேமிக்கப்படுகிறது...")
                        : editingId
                          ? t("Update Farmer", "விவசாயியை புதுப்பிக்கவும்")
                          : t("Add Farmer", "விவசாயியைச் சேர்க்கவும்")}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => {
                          setEditingId(null);
                          setSelectedFarmer(null);
                          setFormData({ name: "", village: "", cropType: "", landSize: "" });
                          setFarmerError("");
                          setFarmerMessage("");
                        }}
                      >
                        {t("Cancel", "ரத்து செய்")}
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <aside className="farmer-detail-panel">
                <h3>{selectedFarmer ? t("Farmer Profile", "விவசாயி விவரம்") : t("Select Farmer", "விவசாயியை தேர்ந்தெடுக்கவும்")}</h3>

                {selectedFarmer ? (
                  <div className="farmer-detail-card">
                    <div className="farmer-avatar-detail">{(selectedFarmer.name || "F").charAt(0).toUpperCase()}</div>
                    <h4>{selectedFarmer.name || t("N/A", "N/A")}</h4>
                    <p><strong>{t("Village", "ஊர்")}:</strong> {selectedFarmer.village || t("N/A", "N/A")}</p>
                    <p><strong>{t("Crop", "பயிர்")}:</strong> {selectedFarmer.cropType || t("N/A", "N/A")}</p>
                    <p><strong>{t("Land Area", "நிலப்பரப்பு")}:</strong> {selectedFarmer.landSize != null ? `${selectedFarmer.landSize} acres` : t("N/A", "N/A")}</p>
                  </div>
                ) : (
                  <p className="farmer-empty-inline">{t("Choose a farmer to view details.", "விவரங்களைப் பார்க்க ஒரு விவசாயியைத் தேர்ந்தெடுக்கவும்.")}</p>
                )}
              </aside>
            </div>

            <section className="farmer-table-panel reveal-on-scroll">
              <div className="farmer-toolbar">
                <div className="search-box">
                  <input
                    type="text"
                    value={farmerSearch}
                    onChange={(event) => setFarmerSearch(event.target.value)}
                    placeholder={t("Search farmers...", "விவசாயிகளை தேடுங்கள்...")}
                    aria-label={t("Search farmers", "விவசாயிகளை தேடுங்கள்")}
                  />
                </div>

                <div className="toolbar-selects">
                  <select value={farmerCropFilter} onChange={(event) => setFarmerCropFilter(event.target.value)} aria-label={t("Filter by crop", "பயிர் மூலம் வடிகட்டவும்")}>
                    <option value="all">{t("All Crops", "அனைத்து பயிர்கள்")}</option>
                    {farmerCropOptions.map((crop) => (
                      <option key={crop} value={crop}>{crop}</option>
                    ))}
                  </select>

                  <select value={farmerSortBy} onChange={(event) => setFarmerSortBy(event.target.value)} aria-label={t("Sort farmers", "விவசாயிகளை வரிசைப்படுத்தவும்")}>
                    <option value="name-asc">{t("Name A → Z", "பெயர் A → Z")}</option>
                    <option value="name-desc">{t("Name Z → A", "பெயர் Z → A")}</option>
                    <option value="recent">{t("Recently added", "சமீபத்தில் சேர்க்கப்பட்டது")}</option>
                    <option value="land-desc">{t("Land area: High to Low", "நிலப்பரப்பு: அதிகம் முதல் குறைவு")}</option>
                    <option value="land-asc">{t("Land area: Low to High", "நிலப்பரப்பு: குறைவு முதல் அதிகம்")}</option>
                    <option value="location">{t("Location", "இடம்")}</option>
                  </select>
                </div>
              </div>

              {farmersLoading ? (
                <div className="farmer-empty-state">
                  <p>{t("Loading farmers...", "விவசாயிகள் ஏற்றப்படுகின்றனர்...")}</p>
                </div>
              ) : farmers.length === 0 ? (
                <div className="farmer-empty-state">
                  <h3>{t("No farmers found", "விவசாயிகள் எவரும் கிடைக்கவில்லை")}</h3>
                  <p>{t("Start managing your farming community by adding your first farmer.", "உங்கள் முதல் விவசாயியைச் சேர்த்து உங்கள் விவசாய சமூகத்தை நிர்வகிக்க தொடங்கவும்.")}</p>
                  <button className="primary-action" onClick={() => setEditingId(null)}>{t("Add Farmer", "விவசாயியைச் சேர்க்கவும்")}</button>
                </div>
              ) : filteredFarmers.length === 0 ? (
                <div className="farmer-empty-state">
                  <h3>{t("No farmers match your search.", "உங்கள் தேடலுக்கு விவசாயிகள் பொருந்தவில்லை.")}</h3>
                  <p>{t("Try a different name, crop, or location.", "வேறு பெயர், பயிர் அல்லது இடத்தை முயற்சிக்கவும்.")}</p>
                  <button className="secondary-action" onClick={() => { setFarmerSearch(""); setFarmerCropFilter("all"); }}>
                    {t("Clear Search", "தேடலை அழிக்கவும்")}
                  </button>
                </div>
              ) : (
                <div className="farmer-table-wrap">
                  <table className="farmer-table">
                    <thead>
                      <tr>
                        <th>{t("Name", "பெயர்")}</th>
                        <th>{t("Village", "ஊர்")}</th>
                        <th>{t("Crop", "பயிர்")}</th>
                        <th>{t("Land Area", "நிலப்பரப்பு")}</th>
                        <th>{t("Actions", "செயல்கள்")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFarmers.map((farmer) => (
                        <tr key={farmer._id}>
                          <td>{farmer.name || t("N/A", "N/A")}</td>
                          <td>{farmer.village || t("N/A", "N/A")}</td>
                          <td>{farmer.cropType || t("N/A", "N/A")}</td>
                          <td>{farmer.landSize != null ? `${farmer.landSize} acres` : t("N/A", "N/A")}</td>
                          <td>
                            <div className="table-actions">
                              <button type="button" className="table-action" aria-label={t("View farmer", "விவசாயியைப் பார்க்கவும்")} onClick={() => setSelectedFarmer(farmer)}>{t("View", "பார்")}</button>
                              <button type="button" className="table-action" aria-label={t("Edit farmer", "விவசாயியைத் திருத்தவும்")} onClick={() => {
                                setEditingId(farmer._id);
                                setSelectedFarmer(farmer);
                                setFormData({
                                  name: farmer.name || "",
                                  village: farmer.village || "",
                                  cropType: farmer.cropType || "",
                                  landSize: farmer.landSize != null ? Number(farmer.landSize) : "",
                                });
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}>{t("Edit", "திருத்து")}</button>
                              <button type="button" className="table-action danger" aria-label={t("Delete farmer", "விவசாயியை நீக்கவும்")} onClick={() => handleDelete(farmer._id)} disabled={farmerDeletingId === farmer._id}>
                                {farmerDeletingId === farmer._id ? t("Deleting...", "நீக்கப்படுகிறது...") : t("Delete", "நீக்கு")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
                {/* ================= WEATHER ================= */}

        {activePage === "weather" && (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2>🌤 {t("Live Weather", "நேரடி வானிலை")}</h2>
            {weatherLoading && <p>{t("Loading weather...", "வானிலை ஏறும்...")}</p>}
            {weatherError && (
              <p style={{ color: "red" }}>
                {t("Error loading weather:", "வானிலை ஏற்றதில் தவறு:")} {weatherError}
              </p>
            )}
            {weather && !weatherLoading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                <div style={{ fontSize: "48px" }}>
                  {getWeatherIcon(weather.weather?.[0]?.icon)}
                </div>
                <h3>
                  {weather.name}, {weather.sys?.country}
                </h3>
                <p>
                  <strong>{t("Temperature:", "தாபநிலை:")}</strong> {Math.round(weather.main?.temp)}°C
                </p>
                <p>
                  <strong>{t("Description:", "விளக்கம்:")}</strong> {weather.weather?.[0]?.description}
                </p>
                <p>
                  <strong>{t("Humidity:", " ஈரப்பதம்:")}</strong> {weather.main?.humidity}%
                </p>
                <p>
                  <strong>{t("Wind Speed:", "காற்றின் வேகம்:")}</strong> {weather.wind?.speed} m/s
                </p>
              </div>
            )}
            {!weather && !weatherLoading && !weatherError && (
              <p>No weather data available.</p>
            )}
          </div>
        )}

        {/* ================= MARKET ================= */}

        {activePage === "market" && (
          <div
            style={{
              background: "rgba(255,255,255,0.95)",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h2>📈 {t("Market Prices", "சந்தை விலைகள்")}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              {marketPrices.map((item, index) => (
                <div
                  key={index}
                  style={{
                    background: "#f1f8e9",
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px solid #c8e6c9",
                  }}
                >
                  <h3>{item.crop}</h3>
                  <p style={{ fontSize: "20px", fontWeight: "bold", color: "#2e7d32" }}>
                    {item.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= DISEASE ================= */}

        {activePage === "disease" && (
          <section className="disease-page service-page">
            <div className="disease-header">
              <div><p className="eyebrow">AI-assisted • Crop Health Desk</p><h2>🩺 {t("Crop Disease Detection", "பயிர் நோய் கண்டறிதல்")}</h2><p className="page-intro">{t("Upload a clear crop image to identify possible diseases and receive practical recommendations.", "சாத்தியமான நோய்களை கண்டறிந்து நடைமுறை பரிந்துரைகளைப் பெற தெளிவான பயிர் படத்தை பதிவேற்றவும்.")}</p></div>
              <Stethoscope size={34} className="disease-header-icon" />
            </div>
            <div className="disease-workspace">
              <div className="disease-upload-panel">
                <label className="upload-dropzone"><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageChange} /> <span className="upload-icon">📷</span><strong>{t("Choose a crop image", "பயிர் படத்தைத் தேர்ந்தெடுக்கவும்")}</strong><small>{t("JPG, PNG or WEBP • Maximum 5 MB", "JPG, PNG அல்லது WEBP • அதிகபட்சம் 5 MB")}</small></label>
                {preview && <div className="disease-preview-wrap"><img className="disease-preview" src={preview} alt={t("Selected crop", "தேர்ந்தெடுக்கப்பட்ட பயிர்")} /></div>}
                <div className="disease-actions"><button className="primary-action" onClick={handleImageUpload} disabled={isAnalyzing}>{isAnalyzing ? t("Analyzing...", "பகுப்பாய்வு செய்கிறது...") : t("Analyze Crop", "பயிரை பகுப்பாய்வு செய்க")}</button>{(selectedImage || analysis || uploadMessage) && <button className="secondary-action" onClick={resetDiseaseAnalysis} disabled={isAnalyzing}>{t("Analyze Another Image", "மற்றொரு படத்தை பகுப்பாய்வு செய்க")}</button>}</div>
                {uploadMessage && <p className="disease-error" role="alert">{uploadMessage}</p>}
              </div>
              <aside className="disease-safety-card"><ShieldCheck size={23} /><strong>{t("Responsible AI guidance", "பொறுப்பான AI வழிகாட்டுதல்")}</strong><p>{t("AI suggestions are visual assistance, not a final diagnosis. Confirm uncertain or severe cases with an agricultural officer.", "AI பரிந்துரைகள் காட்சி உதவி மட்டுமே; இறுதி நோயறிதல் அல்ல. சந்தேகமான அல்லது தீவிரமான நிலைகளில் வேளாண் அலுவலரை அணுகவும்.")}</p></aside>
            </div>
            {analysis && <div className="disease-result-card"><div className="result-card-heading"><div><span className="result-label">{t("Crop Disease Analysis", "பயிர் நோய் பகுப்பாய்வு")}</span><h3>{t("AI analysis result", "AI பகுப்பாய்வு முடிவு")}</h3></div><Stethoscope size={24} /></div>{analysis.structured ? <div className="disease-result-grid">{[["disease", "Disease", "நோய்"], ["crop", "Crop", "பயிர்"], ["confidence", "Confidence", "நம்பகத்தன்மை"], ["symptoms", "Symptoms", "அறிகுறிகள்"], ["cause", "Possible Cause", "சாத்தியமான காரணம்"], ["treatment", "Treatment", "சிகிச்சை"], ["prevention", "Prevention", "தடுப்பு"], ["severity", "Severity", "தீவிரம்"]].filter(([key]) => analysis.structured[key]).map(([key, en, ta]) => <div className="disease-result-field" key={key}><strong>{t(en, ta)}</strong><p>{analysis.structured[key]}</p></div>)}</div> : <div className="disease-raw-result">{analysis.disease}</div>}</div>}
          </section>
        )}

        {/* ================= SETTINGS ================= */}

        {activePage === "settings" && (
          <section className="service-page">
            <div className="settings-feature-grid">
              <section className="settings-panel settings-feature-card reveal-on-scroll">
                <div className="panel-title"><User size={19} /><h3>{t("Profile", "சுயவிவரம்")}</h3></div>
                {profileEditMode ? (
                  <form onSubmit={saveProfile} className="settings-form">
                    <label>{t("Name", "பெயர்")}</label>
                    <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                    <div className="settings-inline-actions">
                      <button className="primary-action" type="submit" disabled={isSavingProfile}>{isSavingProfile ? t("Saving...", "சேமிக்கிறது...") : t("Save profile", "சுயவிவரத்தை சேமிக்கவும்")}</button>
                      <button type="button" onClick={() => setProfileEditMode(false)}>{t("Cancel", "ரத்து")}</button>
                    </div>
                  </form>
                ) : (
                  <div className="profile-summary"><p><strong>{t("Name", "பெயர்")}:</strong> {user?.name || "N/A"}</p><p><strong>{t("Email", "மின்னஞ்சல்")}:</strong> {user?.email || "N/A"}</p><p><strong>{t("User ID", "பயனர் ID")}:</strong> {user?.id || user?._id || "N/A"}</p><button type="button" onClick={() => { setProfileName(user?.name || ""); setProfileEditMode(true); }}><Pencil size={15} />{t("Edit profile", "சுயவிவரத்தைத் திருத்தவும்")}</button></div>
                )}
                {profileMessage && <p className="success-message">{profileMessage}</p>}
                {profileError && <p className="error-message">{profileError}</p>}
              </section>

              <section className="settings-panel settings-feature-card reveal-on-scroll">
                <div className="panel-title"><Sun size={19} /><h3>{t("Appearance", "தோற்றம்")}</h3></div>
                <div className="appearance-options">
                  <button type="button" className={theme === "light" ? "selected-setting" : ""} onClick={() => setTheme("light")}><Sun size={18} />{t("Light mode", "ஒளி முறை")}</button>
                  <button type="button" className={theme === "dark" ? "selected-setting" : ""} onClick={() => setTheme("dark")}><Moon size={18} />{t("Dark mode", "இருள் முறை")}</button>
                </div>
                <p className="setting-help">{t("Your appearance preference is saved on this device.", "உங்கள் தோற்ற விருப்பம் இந்த சாதனத்தில் சேமிக்கப்படும்.")}</p>
              </section>

              <section className="settings-panel settings-feature-card reveal-on-scroll">
                <div className="panel-title"><LockKeyhole size={19} /><h3>{t("Security", "பாதுகாப்பு")}</h3></div>
                <form onSubmit={changePassword} className="settings-form">
                  <input type="password" placeholder={t("Current password", "தற்போதைய கடவுச்சொல்")} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                  <input type="password" placeholder={t("New password", "புதிய கடவுச்சொல்")} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} minLength="6" required />
                  <input type="password" placeholder={t("Confirm new password", "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்")} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} minLength="6" required />
                  <button className="primary-action" type="submit" disabled={isChangingPassword}>{isChangingPassword ? t("Updating...", "புதுப்பிக்கிறது...") : t("Change password", "கடவுச்சொல்லை மாற்றவும்")}</button>
                </form>
                {passwordMessage && <p className="success-message">{passwordMessage}</p>}
                {passwordError && <p className="error-message">{passwordError}</p>}
              </section>

              <section className="settings-panel settings-feature-card reveal-on-scroll">
                <div className="panel-title"><Info size={19} /><h3>{t("About HAKGROS UZHAVAN", "HAKGROS UZHAVAN பற்றி")}</h3></div>
                <p className="about-copy">{t("HAKGROS UZHAVAN is a smart agriculture platform designed to assist farmers with AI-powered farming advice, crop disease analysis, live weather information, agricultural market prices, and digital farming tools.", "HAKGROS UZHAVAN என்பது AI விவசாய ஆலோசனை, பயிர் நோய் பகுப்பாய்வு, நேரடி வானிலை தகவல், சந்தை விலைகள் மற்றும் டிஜிட்டல் விவசாய கருவிகளை வழங்கும் ஸ்மார்ட் விவசாய தளம்.")}</p>
                <div className="about-meta"><span>Version: 1.0</span><span>React · Node.js · MongoDB · AI</span><span>{t("Academic project application", "கல்வித் திட்ட பயன்பாடு")}</span></div>
              </section>
            </div>
            <div className="service-heading"><div><p className="eyebrow">HAKGROS UZHAVAN • Citizen Services</p><h2>{t("Service settings", "சேவை அமைப்புகள்")}</h2><p className="page-intro">{t("Personalise your advisory service, accessibility and notification preferences.", "உங்கள் ஆலோசனை சேவை, அணுகல்தன்மை மற்றும் அறிவிப்பு விருப்பங்களை அமைக்கவும்.")}</p></div><div className="official-seal"><ShieldCheck size={24} /><span>{t("Government service", "அரசு சேவை")}</span></div></div>
            <div className="status-strip"><CheckCircle2 size={18} /><span>{t("All essential services operational", "அனைத்து முக்கிய சேவைகளும் செயல்பாட்டில் உள்ளன")}</span><span className="status-time">Updated just now</span></div>
            <div className="settings-grid">
              <div className="settings-panel"><div className="panel-title"><Bell size={19} /><h3>{t("Alerts and updates", "எச்சரிக்கைகள் மற்றும் புதுப்பிப்புகள்")}</h3></div><label className="toggle-row"><span><strong>{t("Agricultural advisories", "விவசாய ஆலோசனைகள்")}</strong><small>{t("Receive timely crop and weather notices", "பயிர் மற்றும் வானிலை அறிவிப்புகளைப் பெறுங்கள்")}</small></span><input type="checkbox" checked={settings.notifications} onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })} /></label><label className="toggle-row"><span><strong>{t("Data saver mode", "தரவு சேமிப்பு முறை")}</strong><small>{t("Reduce background data requests on mobile networks", "மொபைல் இணையத்தில் பின்னணி தரவு பயன்பாட்டைக் குறைக்கவும்")}</small></span><input type="checkbox" checked={settings.dataSaver} onChange={(e) => setSettings({ ...settings, dataSaver: e.target.checked })} /></label></div>
              <div className="settings-panel"><div className="panel-title"><ClipboardCheck size={19} /><h3>{t("Accessibility and language", "அணுகல்தன்மை மற்றும் மொழி")}</h3></div><div className="setting-select"><label>{t("Preferred language", "விருப்ப மொழி")}</label><select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en">English</option><option value="ta">தமிழ்</option></select></div><label className="toggle-row"><span><strong>{t("High contrast", "அதிக மாறுபாடு")}</strong><small>{t("Improve readability for low-vision users", "குறைந்த பார்வை உள்ளவர்களுக்கு வாசிப்பை மேம்படுத்தவும்")}</small></span><input type="checkbox" checked={settings.highContrast} onChange={(e) => setSettings({ ...settings, highContrast: e.target.checked })} /></label></div>
            </div>
            <div className="privacy-note"><ShieldCheck size={20} /><div><strong>{t("Your choices stay on this device", "உங்கள் விருப்பங்கள் இந்த சாதனத்தில் மட்டுமே சேமிக்கப்படும்")}</strong><p>{t("We use your preferences to tailor the service. You remain in control of your data.", "உங்கள் விருப்பங்களுக்கு ஏற்ப சேவையை மாற்றுகிறோம். உங்கள் தரவு உங்கள் கட்டுப்பாட்டிலேயே இருக்கும்.")}</p></div></div>
            <button className="primary-action" onClick={saveSettings}><Save size={17} />{settingsSaved ? t("Settings saved", "அமைப்புகள் சேமிக்கப்பட்டன") : t("Save preferences", "விருப்பங்களை சேமிக்கவும்")}</button>
            <div className="account-actions"><button className="logout-action" type="button" onClick={handleLogout}><LogOut size={17} />{t("Logout", "வெளியேறு")}</button></div>
          </section>
        )}

        {/* ================= AI ADVISORY ================= */}

        {activePage === "advisory" && (
          <section className="service-page advisory-page">
            <div className="service-heading"><div><p className="eyebrow">AI-assisted • Farmer Support Desk</p><h2>{t("AI Agricultural Advisory", "AI விவசாய ஆலோசனை")}</h2><p className="page-intro">{t("Get a clear, practical first response for your farm. Add context so the guidance is more relevant.", "உங்கள் பண்ணைக்கு தெளிவான, நடைமுறை ஆலோசனையைப் பெறுங்கள். கூடுதல் தகவல் அளித்தால் பதில் மேலும் பொருத்தமாக இருக்கும்.")}</p></div><div className="advisory-badge"><ShieldCheck size={18} />{t("Responsible use", "பொறுப்பான பயன்பாடு")}</div></div>
            <div className="advisory-layout"><div className="advisory-form settings-panel"><div className="panel-title"><ClipboardCheck size={19} /><h3>{t("Describe your situation", "உங்கள் நிலையை விவரிக்கவும்")}</h3></div><div className="quick-prompts"><span>{t("Common requests", "பொதுவான கேள்விகள்")}</span><button onClick={() => setQuery("My crop leaves are turning yellow")}>{t("Yellow leaves", "மஞ்சள் இலைகள்")}</button><button onClick={() => setQuery("How can I manage irrigation today?")}>{t("Irrigation", "நீர்ப்பாசனம்")}</button></div><textarea rows="5" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Example: My paddy leaves have brown spots after recent rain...", "எடுத்துக்காட்டு: சமீபத்திய மழைக்குப் பிறகு நெல் இலைகளில் பழுப்பு புள்ளிகள் உள்ளன...")} /><div className="context-grid"><div><label>{t("Crop", "பயிர்")}</label><select name="crop" value={advisoryContext.crop} onChange={updateAdvisoryContext}><option value="">{t("Select crop", "பயிரைத் தேர்ந்தெடுக்கவும்")}</option><option>Rice</option><option>Banana</option><option>Tomato</option><option>Cotton</option><option>Groundnut</option></select></div><div><label>{t("Growth stage", "வளர்ச்சி நிலை")}</label><select name="stage" value={advisoryContext.stage} onChange={updateAdvisoryContext}><option value="">{t("Select stage", "நிலையைத் தேர்ந்தெடுக்கவும்")}</option><option>Seedling</option><option>Vegetative</option><option>Flowering</option><option>Harvest</option></select></div><div><label><MapPin size={14} />{t("District / village", "மாவட்டம் / கிராமம்")}</label><input name="location" value={advisoryContext.location} onChange={updateAdvisoryContext} /></div><div><label>{t("Priority", "முன்னுரிமை")}</label><select name="urgency" value={advisoryContext.urgency} onChange={updateAdvisoryContext}><option value="routine">{t("Routine guidance", "வழக்கமான ஆலோசனை")}</option><option value="urgent">{t("Urgent crop concern", "அவசர பயிர் பிரச்சனை")}</option></select></div></div><div className="advisory-actions"><label className="ai-toggle"><input id="useGemini" type="checkbox" checked={useGemini} onChange={(e) => setUseGemini(e.target.checked)} />{t("Use advanced AI when available", "கிடைக்கும்போது மேம்பட்ட AI-ஐப் பயன்படுத்தவும்")}</label><button className="primary-action" onClick={handleAskAI} disabled={isLoadingAdvice || !query.trim()}>{isLoadingAdvice ? t("Preparing guidance...", "ஆலோசனை தயாராகிறது...") : t("Get advisory", "ஆலோசனை பெறுங்கள்")}</button></div></div><aside className="advisory-rail"><div className="trust-card"><ShieldCheck size={24} /><strong>{t("Advice with safeguards", "பாதுகாப்புடன் கூடிய ஆலோசனை")}</strong><p>{t("Use this as a first step. Confirm pesticide and disease treatments with a local agricultural officer.", "இதை முதல் படியாகப் பயன்படுத்துங்கள். பூச்சிக்கொல்லி மற்றும் நோய் சிகிச்சையை உள்ளூர் வேளாண் அலுவலரிடம் உறுதிப்படுத்துங்கள்.")}</p></div><div className="office-card"><CalendarDays size={18} /><div><strong>{t("Need human support?", "மனித உதவி தேவையா?")}</strong><p>{t("Visit your nearest Agriculture Extension Centre for field verification.", "கள ஆய்வுக்கு அருகிலுள்ள வேளாண் விரிவாக்க மையத்தை அணுகவும்.")}</p></div></div></aside></div>
            {response && <div className="response-panel"><div className="response-header"><div><span className="result-label">{t("Advisory result", "ஆலோசனை முடிவு")}</span><h3>{t("Recommended next steps", "பரிந்துரைக்கப்படும் அடுத்த படிகள்")}</h3></div><span className="source-tag">{t("Source", "மூலம்")}: {responseSource === "gemini" ? "Advanced AI" : t("Local guidance", "உள்ளூர் வழிகாட்டுதல்")}</span></div><p>{response}</p><div className="response-actions"><button onClick={speakAdvice}><Volume2 size={16} />{t("Listen", "கேளுங்கள்")}</button><button onClick={saveAdvisory}><Save size={16} />{t("Save", "சேமிக்கவும்")}</button><button onClick={() => window.print()}><Printer size={16} />{t("Print", "அச்சிடவும்")}</button></div></div>}
            {savedAdvisories.length > 0 && <div className="saved-section"><h3>{t("Saved advisories", "சேமிக்கப்பட்ட ஆலோசனைகள்")}</h3><div className="saved-list">{savedAdvisories.map((item) => <button key={item.id} onClick={() => { setQuery(item.question); setResponse(item.response); }}><span>{item.question}</span><small>{item.date}</small></button>)}</div></div>}
          </section>
        )}

      </div>
    </div>
  );
}

/* ================= MENU ITEM ================= */

const MenuItem = ({
  title,
  onClick,
}) => (
  <div
    className="menu-item"
    onClick={onClick}
    style={{
      padding: "12px",
      marginTop: "10px",
      cursor: "pointer",
      borderRadius: "8px",
      transition: "0.3s",
      color: "#ffffff",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#CCD67F";
      e.currentTarget.style.color = "#1c3a28";
      e.currentTarget.style.transform = "translateX(6px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = "#ffffff";
      e.currentTarget.style.transform = "translateX(0)";
    }}
  >
    {title}
  </div>
);

export default App;