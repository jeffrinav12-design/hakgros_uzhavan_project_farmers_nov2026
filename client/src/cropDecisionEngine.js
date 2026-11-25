const cropNames = {
  tea: ["Tea", "தேயிலை"],
  banana: ["Banana", "வாழை"],
  paddy: ["Paddy", "நெல்"],
  rice: ["Paddy", "நெல்"],
  pepper: ["Pepper", "மிளகு"],
  tomato: ["Tomato", "தக்காளி"],
};

const cropPractices = {
  tea: ["Maintain a light mulch and avoid waterlogging around tea roots.", "தேயிலை வேர்ப்பகுதியில் மிதமான மூடாக்கைப் பேணி, நீர் தேங்குவதைத் தவிர்க்கவும்."],
  banana: ["Use well-rotted compost around banana plants and keep drainage clear.", "வாழைச் செடிகளைச் சுற்றி நன்கு மக்கிய உரம் இட்டு, வடிகாலைச் சீராக வைத்திருக்கவும்."],
  paddy: ["Use mature compost and manage field water according to the crop stage.", "மக்கிய உரம் இட்டு, பயிரின் வளர்ச்சி நிலைக்கேற்ப வயல் நீரை நிர்வகிக்கவும்."],
  rice: ["Use mature compost and manage field water according to the crop stage.", "மக்கிய உரம் இட்டு, பயிரின் வளர்ச்சி நிலைக்கேற்ப வயல் நீரை நிர்வகிக்கவும்."],
  pepper: ["Maintain organic mulch and good drainage around pepper vines.", "மிளகுக் கொடிகளைச் சுற்றி இயற்கை மூடாக்கையும் நல்ல வடிகாலையும் பராமரிக்கவும்."],
  tomato: ["Maintain even soil moisture and avoid wetting tomato foliage during irrigation.", "சீரான மண் ஈரத்தைப் பேணி, நீர்ப்பாசனத்தின் போது தக்காளி இலைகளை நனைப்பதைத் தவிர்க்கவும்."],
};

const isMatch = (text, words) => words.some((word) => text.includes(word));

export function diagnoseCropStress({ crop, symptoms, temperature, humidity }) {
  const symptomText = String(symptoms || "").toLowerCase();
  const rawCrop = String(crop || "").trim();
  const cropKey = rawCrop.toLowerCase() || Object.entries(cropNames)
    .find(([key, names]) => symptomText.includes(key) || symptomText.includes(names[1]))?.[0] || "";
  const [cropEnglish, cropTamil] = cropNames[cropKey] || [rawCrop || "Unspecified crop", "குறிப்பிடப்படாத பயிர்"];
  const [cropPractice, cropPracticeTamil] = cropPractices[cropKey] || ["Follow locally recommended organic crop care.", "உள்ளூர் பரிந்துரைக்கப்பட்ட இயற்கை பயிர் பராமரிப்பைப் பின்பற்றவும்."];
  const temp = Number(temperature);
  const moisture = Number(humidity);
  const hot = Number.isFinite(temp) && temp >= 35;
  const humid = Number.isFinite(moisture) && moisture >= 85;

  let issue;
  let issueTamil;
  let cause;
  let causeTamil;
  let remedy;
  let remedyTamil;

  if (isMatch(symptomText, ["yellow", "chlorosis", "மஞ்சள்"])) {
    issue = "Possible nutrient or water-stress symptoms";
    issueTamil = "ஊட்டச்சத்து அல்லது நீர் அழுத்த அறிகுறிகள் இருக்கலாம்";
    cause = "Yellowing can have several causes; check drainage, roots, and soil nutrients before treating.";
    causeTamil = "இலை மஞ்சளாதலுக்கு பல காரணங்கள் இருக்கலாம்; சிகிச்சைக்கு முன் வடிகால், வேர்கள், மண் ஊட்டச்சத்துகளைச் சரிபார்க்கவும்.";
    remedy = "Add mature compost or well-rotted farmyard manure, and correct irrigation only after checking soil moisture.";
    remedyTamil = "நன்கு மக்கிய உரம் அல்லது தொழு உரம் சேர்த்து, மண்ணின் ஈரத்தைச் சரிபார்த்த பிறகே நீர்ப்பாசனத்தைச் சரிசெய்யவும்.";
  } else if (isMatch(symptomText, ["white", "powder", "mildew", "rust", "பூஞ்சை", "வெள்ளை", "துரு"])) {
    issue = "Possible fungal leaf disease";
    issueTamil = "இலைப் பூஞ்சை நோய் இருக்கலாம்";
    cause = "Persistent leaf wetness and restricted airflow can encourage fungal growth.";
    causeTamil = "இலைகள் நீண்ட நேரம் ஈரமாக இருப்பதும் காற்றோட்டக் குறைவும் பூஞ்சை வளர்ச்சியை ஊக்குவிக்கலாம்.";
    remedy = "Remove badly affected leaves, improve spacing and airflow, and consider a locally approved Trichoderma-based biofungicide.";
    remedyTamil = "கடுமையாகப் பாதிக்கப்பட்ட இலைகளை அகற்றி, இடைவெளி மற்றும் காற்றோட்டத்தை மேம்படுத்தி, உள்ளூரில் அங்கீகரிக்கப்பட்ட டிரைக்கோடெர்மா உயிர் பூஞ்சைக் கொல்லியைப் பரிசீலிக்கவும்.";
  } else if (isMatch(symptomText, ["brown spot", "spots", "blight", "பழுப்பு", "புள்ளி"])) {
    issue = "Possible leaf-spot or blight symptoms";
    issueTamil = "இலைப்புள்ளி அல்லது கருகல் அறிகுறிகள் இருக்கலாம்";
    cause = "Leaf spots may be fungal, bacterial, or environmental; a photo alone cannot confirm the cause.";
    causeTamil = "இலைப்புள்ளிகள் பூஞ்சை, பாக்டீரியா அல்லது சுற்றுச்சூழல் காரணமாக இருக்கலாம்; படத்தை மட்டும் வைத்து காரணத்தை உறுதிப்படுத்த முடியாது.";
    remedy = "Remove infected debris, avoid overhead watering, and use a locally approved biological biofungicide such as Trichoderma only after field confirmation.";
    remedyTamil = "பாதிக்கப்பட்ட கழிவுகளை அகற்றி, மேலிருந்து நீர் தெளிப்பதைத் தவிர்த்து, கள ஆய்வுக்குப் பிறகு டிரைக்கோடெர்மா போன்ற உள்ளூரில் அங்கீகரிக்கப்பட்ட உயிர் பூஞ்சைக் கொல்லியை மட்டும் பயன்படுத்தவும்.";
  } else if (isMatch(symptomText, ["wilt", "wilting", "வாடி", "வாட்டம்"])) {
    issue = "Possible wilting or root-zone stress";
    issueTamil = "வாடல் அல்லது வேர் பகுதி அழுத்தம் இருக்கலாம்";
    cause = "Check soil moisture and drainage; wilting can result from either drought, waterlogging, or root disease.";
    causeTamil = "மண் ஈரப்பதம் மற்றும் வடிகாலைக் கவனிக்கவும்; வறட்சி, நீர் தேக்கம் அல்லது வேர் நோய் வாடலை ஏற்படுத்தலாம்.";
    remedy = "Restore even soil moisture, clear standing water, and use mature compost; seek field diagnosis if plants continue to wilt.";
    remedyTamil = "மண்ணில் சீரான ஈரத்தைப் பேணி, தேங்கிய நீரை வெளியேற்றி, மக்கிய உரம் பயன்படுத்தவும்; வாடல் தொடர்ந்தால் கள ஆய்வு பெறவும்.";
  } else if (hot || humid) {
    issue = "Possible weather-related crop stress";
    issueTamil = "வானிலை சார்ந்த பயிர் அழுத்தம் இருக்கலாம்";
    cause = `${hot ? "High temperature" : ""}${hot && humid ? " and " : ""}${humid ? "high humidity" : ""} can increase crop stress and disease pressure.`;
    causeTamil = `${hot ? "அதிக வெப்பம்" : ""}${hot && humid ? " மற்றும் " : ""}${humid ? "அதிக ஈரப்பதம்" : ""} பயிர் அழுத்தத்தையும் நோய் அபாயத்தையும் அதிகரிக்கலாம்.`;
    remedy = "Check plants early in the day, maintain appropriate soil moisture, improve airflow, and apply compost as needed.";
    remedyTamil = "காலையில் பயிர்களைப் பரிசோதித்து, மண்ணின் ஈரத்தைச் சரியாகப் பேணி, காற்றோட்டத்தை மேம்படுத்தி, தேவைக்கேற்ப மக்கிய உரம் இடவும்.";
  } else {
    issue = "No specific stress symptom identified";
    issueTamil = "குறிப்பிட்ட அழுத்த அறிகுறி கண்டறியப்படவில்லை";
    cause = "The available symptoms are not enough to identify a specific disease or nutrient deficiency.";
    causeTamil = "குறிப்பிட்ட நோய் அல்லது ஊட்டச்சத்துக் குறையை அறிய வழங்கப்பட்ட அறிகுறிகள் போதவில்லை.";
    remedy = "Continue regular scouting, maintain balanced soil nutrition, and record any new symptoms for a local extension officer.";
    remedyTamil = "தொடர்ந்து பயிர்களைப் பரிசோதித்து, மண் ஊட்டச்சத்தைச் சமநிலையில் பேணி, புதிய அறிகுறிகளை உள்ளூர் வேளாண் அலுவலரிடம் தெரிவிக்க பதிவு செய்யவும்.";
  }

  const symptomSummary = String(symptoms || "").trim() || "No symptoms supplied";
  const symptomSummaryTamil = String(symptoms || "").trim() || "அறிகுறிகள் வழங்கப்படவில்லை";

  return [
    `Disease Name: ${issue} / ${issueTamil}`,
    `Crop: ${cropEnglish} / ${cropTamil}`,
    "Confidence: Low — symptom-based guidance only / குறைவு — அறிகுறி அடிப்படையிலான வழிகாட்டுதல்",
    `Symptoms: ${symptomSummary} / ${symptomSummaryTamil}`,
    `Possible Cause: ${cause} / ${causeTamil}`,
    `Treatment: ${remedy} / ${remedyTamil}`,
    `Prevention: ${cropPractice} Scout regularly, remove diseased debris, and verify treatment with a local agricultural officer. / ${cropPracticeTamil} தொடர்ந்து கண்காணித்து, நோயுற்ற கழிவுகளை அகற்றி, சிகிச்சையை உள்ளூர் வேளாண் அலுவலரிடம் உறுதிப்படுத்தவும்.`,
    "Severity: Unconfirmed; assess in the field / தீவிரம்: உறுதிப்படுத்தப்படவில்லை; களத்தில் மதிப்பிடவும்",
  ].join("\n");
}
