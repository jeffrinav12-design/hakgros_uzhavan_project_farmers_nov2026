const mongoose = require('mongoose');

const CropTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Sowing', 'Irrigation', 'Fertilizer', 'Pest Monitoring', 'Disease Monitoring', 'Weeding', 'Harvest', 'Other', 'Land Preparation', 'Crop Growth', 'Nutrient Management'],
      default: 'Other',
    },
    plannedDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Upcoming', 'Due Today', 'Completed', 'Overdue'],
      default: 'Upcoming',
    },
    description: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    completedAt: { type: Date, default: null },
  },
  { _id: true }
);

const CropPlanSchema = new mongoose.Schema(
  {
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cropName: { type: String, required: true, trim: true },
    variety: { type: String, trim: true, default: '' },
    season: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    landArea: { type: Number, min: 0, default: 0 },
    sowingDate: { type: Date, required: true },
    expectedHarvestDate: { type: Date, default: null },
    tasks: [CropTaskSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CropPlan', CropPlanSchema);
