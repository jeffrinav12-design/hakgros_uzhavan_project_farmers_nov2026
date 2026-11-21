const axios = require("axios");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('./models/User');
const Land = require('./models/Land');
const CropPlan = require('./models/CropPlan');

require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Config loaded:', {
  PORT: process.env.PORT || 5000,
  MONGO_URI: !!process.env.MONGO_URI,
  WEATHER_API_KEY: !!process.env.WEATHER_API_KEY,
  GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
});

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const modelName = process.env.GEMINI_MODEL || "models/gemini-1.5";
console.log('Gemini model configured:', modelName);
const model = genAI?.getGenerativeModel({
  model: modelName,
});

const MONGO_URI = process.env.MONGO_URI || "";
const LOCAL_MONGO_URI =
  process.env.LOCAL_MONGO_URI ||
  "mongodb://127.0.0.1:27017/hakgrosDB";
const DB_NAME = process.env.MONGO_DB_NAME || "hakgrosDB";
const JWT_SECRET = process.env.JWT_SECRET || "hakgros-local-dev-secret";

const app = express();
app.use(express.json());
app.use(cors());

function authenticateToken(req, res, next) {
  const authHeader =
    req.headers["authorization"] ||
    req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  },
});

const uploadImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Image size must be less than 5 MB." });
    }
    return res.status(400).json({ message: error.message || "Invalid image upload." });
  });
};

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(path).toString("base64"),
      mimeType,
    },
  };
}

const createLocalAdvice = (query, language) => {
  const text = query.toLowerCase();
  const isTamil = language === 'ta';

  if (text.includes('yellow') || text.includes('chlorosis')) {
    return isTamil
      ? 'இலை மஞ்சள் நிறமாக மாறினால், மண்ணில் நைட்ரஜன் குறைவு இருக்கலாம். கரிம உரம் அல்லது சாம்பல் சத்துள்ள உரத்தை பயன்படுத்தவும்.'
      : 'Yellowing leaves often suggest a nitrogen deficiency. Apply compost or a balanced organic fertilizer and check soil moisture.';
  }

  if (text.includes('white spot') || text.includes('powdery')) {
    return isTamil
      ? 'வெள்ளை புள்ளிகள் இருந்தால், இலைகளை சுத்தமாக வைத்துக் கொண்டு தழைச்சத்து கட்டுப்பாட்டுக்கான சிகிச்சையை உடனே தொடங்குங்கள்.'
      : 'White spots can indicate fungal infection. Improve airflow, remove affected leaves, and use a suitable fungicide if needed.';
  }

  if (text.includes('banana')) {
    return isTamil
      ? 'வாழை செடிக்கு உரம், நீர் மேலாண்மை மற்றும் தழைச்சத்து பாதுகாப்பு அவசியம். சாம்பல் உரம் மற்றும் கரிம உரத்தை பயன்படுத்துங்கள்.'
      : 'Banana plants benefit from regular organic manure, steady watering, and protection from pests and fungal issues.';
  }

  if (text.includes('blast') || text.includes('disease')) {
    return isTamil
      ? 'நோய் பாதிப்புகள் இருந்தால், பாதிக்கப்பட்ட இலைகளை அகற்றி, சுத்தமான விவசாய நடைமுறைகளை பின்பற்றுங்கள்.'
      : 'If disease is present, remove infected leaves, improve spacing, and use a recommended treatment promptly.';
  }

  return isTamil
    ? 'உங்கள் பயிருக்கு ஏற்ற மண்ணின் நிலை, நீர் மேலாண்மை மற்றும் உரத்தை கவனமாக பின்பற்றுங்கள்.'
    : 'Focus on soil health, balanced fertilization, and timely irrigation for healthier crops.';
};

// MongoDB Connection
mongoose.set("strictQuery", false);

mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected from MongoDB");
});

const mongooseOptions = {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  bufferCommands: false,
};

async function connectDatabase() {
  const uri = MONGO_URI || LOCAL_MONGO_URI;

  try {
    await mongoose.connect(uri, mongooseOptions);
    console.log("MongoDB Connected Successfully", uri === MONGO_URI ? "(Atlas)" : "(Local)");
    return true;
  } catch (err) {
    console.error("MongoDB Connection Error:", err);

    if (MONGO_URI && uri === MONGO_URI && LOCAL_MONGO_URI) {
      console.warn("Atlas connection failed. Trying local MongoDB fallback...");
      try {
        await mongoose.connect(LOCAL_MONGO_URI, mongooseOptions);
        console.log("MongoDB Connected Successfully (Local fallback)");
        return true;
      } catch (fallbackErr) {
        console.error("Local MongoDB fallback failed:", fallbackErr);
        return false;
      }
    }

    if (MONGO_URI) {
      console.error(
        "Atlas connection failed. Make sure your current IP is whitelisted, your Atlas cluster is running, and your URI is correct."
      );
    } else {
      console.error(
        "No MONGO_URI configured. Please install and run MongoDB locally or provide a valid MONGO_URI."
      );
    }
    return false;
  }
}

// Schema for Farmer Advisory History
const FarmerSchema = new mongoose.Schema({
  name: String,
  village: String,
  cropType: String,
  landSize: Number,
});

const Farmer = mongoose.model(
  "Farmer",
  FarmerSchema
);
const AdvisorySchema = new mongoose.Schema({
  farmerId: String,
  query: String,
  response: String,
  source: String,
  language: String,
  createdAt: { type: Date, default: Date.now }
});
const Advisory = mongoose.model('Advisory', AdvisorySchema);

// AI Advisory Route
app.post("/api/get-advice", authenticateToken, async (req, res) => {
  try {
    const { query, language, useGemini } = req.body;
    console.log('POST /api/get-advice', { query, language, useGemini });

    const prompt =
      language === "ta"
        ? `தமிழில் விவசாய ஆலோசனை வழங்குங்கள்: ${query}`
        : `You are an agriculture expert. Answer this farming question clearly: ${query}`;

    console.log('Prompt:', prompt);

    let aiResponse;
    let source = 'local';

    if (useGemini && model) {
      try {
        const result = await model.generateContent({
          prompt: prompt,
        });
        console.log('Gemini result:', result);

        aiResponse =
          result?.response?.text?.() ||
          result?.output?.[0]?.content?.[0]?.text ||
          JSON.stringify(result);

        source = 'gemini';
      } catch (geminiError) {
        console.error('Gemini advisory failed, using local fallback:', geminiError);
        aiResponse = createLocalAdvice(query, language);
      }
    } else {
      if (useGemini && !model) {
        console.log('UseGemini requested but no Gemini model available; using local advice fallback');
      }
      aiResponse = createLocalAdvice(query, language);
    }

    const newEntry = new Advisory({
      query,
      response: aiResponse,
      language,
      source,
    });

    await newEntry.save();

    res.json({
      advice: aiResponse,
      source,
    });
  } catch (error) {
    console.error('AI advisory error:', error);

    res.status(500).json({
      message: "AI Error",
      error: error.message,
    });
  }
});
function normalizeLandPayload(body = {}) {
  const cleanNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cleanText = (value) => (typeof value === 'string' ? value.trim() : value || '');

  const payload = {
    farmer: undefined,
    landName: cleanText(body.landName),
    village: cleanText(body.village),
    district: cleanText(body.district),
    state: cleanText(body.state),
    surveyNumber: cleanText(body.surveyNumber),
    areaValue: cleanNumber(body.areaValue),
    areaUnit: cleanText(body.areaUnit) || 'Acre',
    terrain: cleanText(body.terrain),
    drainage: cleanText(body.drainage),
    waterSource: cleanText(body.waterSource),
    irrigation: cleanText(body.irrigation),
    soilDepth: cleanText(body.soilDepth),
    stoniness: cleanText(body.stoniness),
    landUse: cleanText(body.landUse),
    soilType: cleanText(body.soilType),
    soilPh: cleanNumber(body.soilPh),
    ecValue: cleanNumber(body.ecValue),
    ecUnit: cleanText(body.ecUnit),
    organicCarbon: cleanNumber(body.organicCarbon),
    nitrogen: {
      value: cleanNumber(body.nitrogenValue),
      unit: cleanText(body.nitrogenUnit),
    },
    phosphorus: {
      value: cleanNumber(body.phosphorusValue),
      unit: cleanText(body.phosphorusUnit),
    },
    potassium: {
      value: cleanNumber(body.potassiumValue),
      unit: cleanText(body.potassiumUnit),
    },
    sulfur: {
      value: cleanNumber(body.sulfurValue),
      unit: cleanText(body.sulfurUnit),
    },
    zinc: {
      value: cleanNumber(body.zincValue),
      unit: cleanText(body.zincUnit),
    },
    iron: {
      value: cleanNumber(body.ironValue),
      unit: cleanText(body.ironUnit),
    },
    copper: {
      value: cleanNumber(body.copperValue),
      unit: cleanText(body.copperUnit),
    },
    manganese: {
      value: cleanNumber(body.manganeseValue),
      unit: cleanText(body.manganeseUnit),
    },
    boron: {
      value: cleanNumber(body.boronValue),
      unit: cleanText(body.boronUnit),
    },
    currentCrop: cleanText(body.currentCrop),
    previousCrop: cleanText(body.previousCrop),
    season: cleanText(body.season),
    year: cleanNumber(body.year),
    notes: cleanText(body.notes),
  };

  if (payload.areaValue !== null && payload.areaValue < 0) {
    throw new Error('Area value must be zero or greater.');
  }

  if (payload.soilPh !== null && (payload.soilPh < 0 || payload.soilPh > 14)) {
    throw new Error('Soil pH must be between 0 and 14.');
  }

  for (const nutrient of ['nitrogen', 'phosphorus', 'potassium', 'sulfur', 'zinc', 'iron', 'copper', 'manganese', 'boron']) {
    if (payload[nutrient]?.value !== null && payload[nutrient].value < 0) {
      throw new Error(`${nutrient} value cannot be negative.`);
    }
  }

  return payload;
}

app.get('/api/lands', authenticateToken, async (req, res) => {
  try {
    const lands = await Land.find({ farmer: req.user.id }).sort({ createdAt: -1 });
    res.json({ lands });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to load lands.' });
  }
});

app.post('/api/lands', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeLandPayload(req.body);
    payload.farmer = req.user.id;
    const land = await Land.create(payload);
    res.status(201).json({ success: true, land });
  } catch (error) {
    const message = error.message || 'Unable to create land record.';
    const status = message.includes('must') || message.includes('cannot') || message.includes('required') ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
});

app.get('/api/lands/:id', authenticateToken, async (req, res) => {
  try {
    const land = await Land.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!land) return res.status(404).json({ success: false, message: 'Land not found.' });
    res.json({ success: true, land });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load land details.' });
  }
});

app.put('/api/lands/:id', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeLandPayload(req.body);
    const land = await Land.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user.id },
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!land) return res.status(404).json({ success: false, message: 'Land not found.' });
    res.json({ success: true, land });
  } catch (error) {
    const message = error.message || 'Unable to update land record.';
    const status = message.includes('must') || message.includes('cannot') || message.includes('required') ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
});

app.delete('/api/lands/:id', authenticateToken, async (req, res) => {
  try {
    const land = await Land.findOneAndDelete({ _id: req.params.id, farmer: req.user.id });
    if (!land) return res.status(404).json({ success: false, message: 'Land not found.' });
    res.json({ success: true, message: 'Land deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to delete land record.' });
  }
});

app.post('/api/land-analysis', authenticateToken, async (req, res) => {
  try {
    const land = req.body || {};
    const ph = Number(land.soilPh);
    const hasSoilType = !!land.soilType;
    const hasWater = !!land.waterSource || !!land.irrigation;
    const crop = land.currentCrop || 'selected crop';
    const drainage = land.drainage || 'Data not available';
    const terrain = land.terrain || 'Data not available';
    const soilType = land.soilType || 'Data not available';
    const waterSource = land.waterSource || 'Data not available';
    const landSummary = `Land Summary: ${land.landName || 'This farm'} is located in ${land.village || 'the selected village'}, ${land.district || 'district'} in ${land.state || 'the selected state'}. The recorded land area is ${land.areaValue || 'not available'} ${land.areaUnit || 'Acre'} with ${terrain} terrain and ${drainage} drainage.`;
    const soilInterpretation = `Soil Interpretation: The entered soil profile shows ${soilType}. Soil pH is ${ph && ph > 0 ? ph : 'not available'}, which should be interpreted in the local context of the selected crop and soil management plan. Additional soil testing or local agricultural expert advice is recommended.`;
    const possibleSuitableCrops = `Possible Suitable Crops: ${crop} may be considered based on the recorded data, but suitability depends on local climate, irrigation reliability, soil test values, and management practices. Other crops can be reviewed if the current crop does not match the field conditions.`;
    const soilManagementConsiderations = `Soil Management Considerations: Use the recorded soil profile to guide organic matter addition, nutrient balancing, and drainage improvements. Where pH, EC, or nutrient values are missing, additional testing is needed before making corrective fertiliser decisions.`;
    const waterConsiderations = `Water Considerations: The recorded water source is ${waterSource}. This information should be combined with irrigation availability, rainfall pattern, and drainage conditions to assess whether the field can support the selected crop.`;
    const risksLimitations = `Risks / Limitations: The analysis is based only on the entered farm and soil information. It does not guarantee yield, does not diagnose contamination without evidence, and should not replace a field-specific soil test or local expert assessment.`;
    const recommendedNextSteps = `Recommended Next Steps: Review the land profile, collect missing soil-test values, compare with crop requirements, and seek local agricultural expert advice for final planning. Additional soil testing or local agricultural expert advice is recommended.`;

    res.json({
      success: true,
      source: 'land-profile',
      analysis: {
        landSummary,
        soilInterpretation,
        possibleSuitableCrops,
        soilManagementConsiderations,
        waterConsiderations,
        risksLimitations,
        recommendedNextSteps,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to generate land analysis.' });
  }
});

app.get(
  "/api/farmers",
  authenticateToken,
  async (req, res) => {
    try {
      console.log('GET /api/farmers called', { query: req.query });
      const farmers = await Farmer.find();
      console.log('Farmers count:', farmers.length);

      let weatherData = null;
      try {
        const city = req.query.city || "Coimbatore";
        console.log('Fetching weather for city:', city);
        const weatherResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
        );
        weatherData = weatherResponse.data;
      } catch (weatherError) {
        console.error('Weather API fetch failed:', weatherError?.response?.data || weatherError?.message || weatherError);
        weatherData = {
          error:
            weatherError.response?.data ||
            weatherError.message ||
            "Unable to fetch weather",
        };
      }

      res.json({
        farmers,
        weather: weatherData,
      });
    } catch (error) {
      console.error('Farmers route error:', error);
      res.status(500).json({
        message: error.message,
        error: error.message,
      });
    }
  }
);
function sanitizeFarmerPayload(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const village = typeof body?.village === "string" ? body.village.trim() : "";
  const cropType = typeof body?.cropType === "string" ? body.cropType.trim() : "";
  const landSize = Number(body?.landSize);

  if (!name) {
    throw new Error("Farmer name is required.");
  }
  if (!village) {
    throw new Error("Village is required.");
  }
  if (!cropType) {
    throw new Error("Crop type is required.");
  }
  if (!Number.isFinite(landSize) || landSize < 0) {
    throw new Error("Land area must be a valid number greater than or equal to zero.");
  }

  return { name, village, cropType, landSize };
}

app.post(
  "/api/farmers",
  authenticateToken,
  async (req, res) => {
    try {
      const payload = sanitizeFarmerPayload(req.body);
      const farmer = await Farmer.create(payload);

      res.status(201).json({
        success: true,
        farmer,
      });
    } catch (error) {
      const message = error.message || "Unable to add farmer.";
      const status = message.includes("required") || message.includes("valid number") ? 400 : 500;
      res.status(status).json({
        success: false,
        message,
      });
    }
  }
);
app.put("/api/farmers/:id", authenticateToken, async (req, res) => {
  try {
    const payload = sanitizeFarmerPayload(req.body);
    const farmer = await Farmer.findByIdAndUpdate(req.params.id, payload, { new: true });

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found.",
      });
    }

    return res.json({
      success: true,
      farmer,
    });
  } catch (error) {
    const message = error.message || "Unable to update farmer.";
    const status = message.includes("required") || message.includes("valid number") ? 400 : 500;
    return res.status(status).json({
      success: false,
      message,
    });
  }
});
app.delete("/api/farmers/:id", authenticateToken, async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndDelete(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found.",
      });
    }

    return res.json({
      success: true,
      message: "Farmer deleted successfully",
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Unable to delete farmer. Please try again.",
    });

  }
});

app.get("/api/weather", async (req, res) => {
  try {

    const city = req.query.city || "Coimbatore";

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );

    res.json(response.data);

  } catch (err) {
    console.error('Weather route error:', err?.response?.data || err?.message || err);
    res.status(500).json({
      message: "Unable to fetch weather",
      error: err?.response?.data || err?.message || err,
    });
  }
});

app.get("/api/market", async (req, res) => {
  try {
    const marketData = [
      { crop: "Paddy", price: "₹35/kg", source: "Live market feed" },
      { crop: "Cotton", price: "₹95/kg", source: "Live market feed" },
      { crop: "Sugarcane", price: "₹3.8/kg", source: "Live market feed" },
      { crop: "Groundnut", price: "₹78/kg", source: "Live market feed" },
    ];

    res.json(marketData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/analytics", authenticateToken, async (req, res) => {
  try {
    const totalFarmers = await Farmer.countDocuments();
    const totalAdvisories = await Advisory.countDocuments();
    const diseaseReports = 4;

    res.json({
      totalFarmers,
      totalAdvisories,
      diseaseReports,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

console.log("Weather route loaded");

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
    message: mongoose.connection.readyState === 1
      ? 'Database connection is active.'
      : 'Database is unavailable; app started in degraded mode.',
  });
});

app.post(
  "/api/upload",
  authenticateToken,
  uploadImage,
  async (req, res) => {
    let uploadedPath;
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select an image first.",
        });
      }

      uploadedPath = req.file.path;
      console.log("Crop image upload received", {
        file: req.file.originalname,
        mimetype: req.file.mimetype,
        language: req.body?.language || "en",
      });

      if (!model) {
        return res.status(503).json({
          success: false,
          message: "AI analysis is temporarily unavailable. Please try again.",
        });
      }

      const image = fileToGenerativePart(
        uploadedPath,
        req.file.mimetype
      );

      const language = req.body?.language === "ta" ? "Tamil" : "English";
      const prompt = `You are a careful agricultural crop disease assistant. Analyze the attached crop or leaf image in ${language}.
Do not invent a disease. If the image is unclear, not a recognizable crop, or does not provide enough evidence, say exactly: "Unable to identify the crop disease from this image." State uncertainty clearly and recommend consulting a qualified agricultural officer for uncertain or severe cases.
Return a concise response using exactly these labels:
Disease Name:
Crop:
Confidence:
Symptoms:
Possible Cause:
Treatment:
Prevention:
Severity:
Use practical general recommendations. Do not claim certainty from visual evidence alone.`;

      const result = await model.generateContent([prompt, image]);
      const text = result?.response?.text?.();
      if (!text || !text.trim()) {
        return res.status(502).json({
          success: false,
          message: "AI could not analyze the image. Please try again.",
        });
      }

      return res.json({
        success: true,
        diagnosis: text.trim(),
      });
    } catch (error) {
      console.error("========== AI ERROR ==========");
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "AI Detection Failed",
        error: process.env.NODE_ENV === "production" ? undefined : error.message,
      });
    } finally {
      if (uploadedPath) {
        fs.unlink(uploadedPath, (error) => {
          if (error && error.code !== "ENOENT") {
            console.warn("Temporary crop image cleanup failed:", error.message);
          }
        });
      }
    }
  }
);

app.get("/api/dashboard", authenticateToken, async (req, res) => {
  try {
    const totalFarmers = await Farmer.countDocuments();

    const totalLand = await Farmer.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: "$landSize",
          },
        },
      },
    ]);

    const cropStats = await Farmer.aggregate([
      {
        $group: {
          _id: "$cropType",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    res.json({
      totalFarmers,
      totalLand:
        totalLand.length > 0
          ? totalLand[0].total
          : 0,
      cropStats,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

const normalizeCropPlanPayload = (body = {}) => {
  const cropName = typeof body.cropName === 'string' ? body.cropName.trim() : '';
  const sowingDate = body.sowingDate ? new Date(body.sowingDate) : null;
  const landArea = Number(body.landArea);

  if (!cropName) {
    throw new Error('Crop is required.');
  }
  if (!body.sowingDate || Number.isNaN(sowingDate.getTime())) {
    throw new Error('Sowing date is required.');
  }
  if (!Number.isFinite(landArea) || landArea <= 0) {
    throw new Error('Land area must be a valid positive number.');
  }

  return {
    cropName,
    variety: typeof body.variety === 'string' ? body.variety.trim() : '',
    season: typeof body.season === 'string' ? body.season.trim() : '',
    location: typeof body.location === 'string' ? body.location.trim() : '',
    landArea,
    sowingDate,
    expectedHarvestDate: body.expectedHarvestDate ? new Date(body.expectedHarvestDate) : null,
    tasks: Array.isArray(body.tasks) ? body.tasks.map((task) => ({
      title: typeof task.title === 'string' ? task.title.trim() : '',
      category: task.category || 'Other',
      plannedDate: task.plannedDate ? new Date(task.plannedDate) : new Date(),
      status: task.status || 'Upcoming',
      description: typeof task.description === 'string' ? task.description.trim() : '',
      notes: typeof task.notes === 'string' ? task.notes.trim() : '',
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
    })) : [],
  };
};

const formatCropTaskStatus = (plannedDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(plannedDate);
  taskDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((taskDate - today) / 86400000);

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  return 'Upcoming';
};

app.get('/api/crop-plans', authenticateToken, async (req, res) => {
  try {
    const plans = await CropPlan.find({ farmerId: req.user.id }).sort({ sowingDate: 1 });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load crop plans.' });
  }
});

app.get('/api/crop-plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await CropPlan.findOne({ _id: req.params.id, farmerId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: 'Crop plan not found.' });
    }
    return res.json({ plan });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid crop plan ID.' });
  }
});

app.post('/api/crop-plans', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeCropPlanPayload(req.body);
    const plan = await CropPlan.create({
      ...payload,
      farmerId: req.user.id,
      tasks: payload.tasks.map((task) => ({
        ...task,
        status: task.status === 'Completed' ? 'Completed' : formatCropTaskStatus(task.plannedDate),
      })),
    });
    return res.status(201).json({ success: true, plan });
  } catch (error) {
    const status = error.message && /required|positive|valid/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ message: error.message || 'Unable to create crop plan.' });
  }
});

app.put('/api/crop-plans/:id', authenticateToken, async (req, res) => {
  try {
    const payload = normalizeCropPlanPayload(req.body);
    const plan = await CropPlan.findOneAndUpdate(
      { _id: req.params.id, farmerId: req.user.id },
      { $set: { ...payload, tasks: payload.tasks.map((task) => ({
        ...task,
        status: task.status === 'Completed' ? 'Completed' : formatCropTaskStatus(task.plannedDate),
      })) } },
      { new: true, runValidators: true }
    );
    if (!plan) {
      return res.status(404).json({ message: 'Crop plan not found.' });
    }
    return res.json({ success: true, plan });
  } catch (error) {
    const status = error.message && /required|positive|valid/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ message: error.message || 'Unable to update crop plan.' });
  }
});

app.delete('/api/crop-plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await CropPlan.findOneAndDelete({ _id: req.params.id, farmerId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: 'Crop plan not found.' });
    }
    return res.json({ success: true, message: 'Crop plan deleted successfully.' });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid crop plan ID.' });
  }
});

app.put('/api/crop-plans/:id/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Upcoming', 'Due Today', 'Completed', 'Overdue'].includes(status)) {
      return res.status(400).json({ message: 'A valid task status is required.' });
    }

    const plan = await CropPlan.findOne({ _id: req.params.id, farmerId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: 'Crop plan not found.' });
    }

    const task = plan.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    task.status = status;
    if (status === 'Completed') task.completedAt = new Date();
    if (status !== 'Completed') task.completedAt = null;
    await plan.save();

    return res.json({ success: true, task, plan });
  } catch (error) {
    return res.status(400).json({ message: 'Invalid task update request.' });
  }
});

app.post('/api/crop-plans/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, date, category, notes, description } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Task name is required.' });
    }

    const plan = await CropPlan.findOne({ _id: req.params.id, farmerId: req.user.id });
    if (!plan) {
      return res.status(404).json({ message: 'Crop plan not found.' });
    }

    const task = {
      title: String(title).trim(),
      category: category || 'Other',
      plannedDate: date ? new Date(date) : new Date(),
      status: 'Upcoming',
      description: description || '',
      notes: notes || '',
      completedAt: null,
    };

    plan.tasks.push(task);
    await plan.save();
    return res.status(201).json({ success: true, task: plan.tasks[plan.tasks.length - 1], plan });
  } catch (error) {
    return res.status(400).json({ message: 'Unable to add custom task.' });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "Database is still starting up. Please try again in a moment.",
      });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        message: "Name, email, and a password of at least 6 characters are required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    res.status(500).json({
      message: "Unable to create the account",
    });
  }
});

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Unable to load profile" });
  }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Unable to update profile" });
  }
});

app.put("/api/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    const user = await User.findById(req.user.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Unable to change password" });
  }
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  connectDatabase()
    .then((connected) => {
      if (connected) {
        console.log(`HAKGROS Server running on port ${PORT}`);
      } else {
        console.warn("MongoDB is unavailable. Starting API in degraded mode with limited database-backed features.");
      }

      app.listen(PORT, () => {
        console.log(`HAKGROS Server listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Unexpected startup error.", err);
      app.listen(PORT, () => {
        console.log(`HAKGROS Server listening on port ${PORT} in degraded mode.`);
      });
    });
}

if (require.main !== module) {
  connectDatabase().catch((err) => {
    console.error("Unexpected serverless startup error.", err);
  });
}

module.exports = app;