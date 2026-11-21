const mongoose = require('mongoose');

const NutrientSchema = new mongoose.Schema(
  {
    value: { type: Number, default: null },
    unit: { type: String, default: '' },
  },
  { _id: false }
);

const LandSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landName: { type: String, trim: true },
    village: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    surveyNumber: { type: String, trim: true },
    areaValue: { type: Number, default: null },
    areaUnit: { type: String, enum: ['Acre', 'Cent', 'Hectare', 'Square Meter', 'Square Feet'], default: 'Acre' },
    terrain: { type: String, trim: true },
    drainage: { type: String, trim: true },
    waterSource: { type: String, trim: true },
    irrigation: { type: String, trim: true },
    soilDepth: { type: String, trim: true },
    stoniness: { type: String, trim: true },
    landUse: { type: String, trim: true },
    soilType: { type: String, trim: true },
    soilPh: { type: Number, min: 0, max: 14, default: null },
    ecValue: { type: Number, default: null },
    ecUnit: { type: String, trim: true },
    organicCarbon: { type: Number, default: null },
    nitrogen: { type: NutrientSchema, default: {} },
    phosphorus: { type: NutrientSchema, default: {} },
    potassium: { type: NutrientSchema, default: {} },
    sulfur: { type: NutrientSchema, default: {} },
    zinc: { type: NutrientSchema, default: {} },
    iron: { type: NutrientSchema, default: {} },
    copper: { type: NutrientSchema, default: {} },
    manganese: { type: NutrientSchema, default: {} },
    boron: { type: NutrientSchema, default: {} },
    currentCrop: { type: String, trim: true },
    previousCrop: { type: String, trim: true },
    season: { type: String, trim: true },
    year: { type: Number, default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Land', LandSchema);
