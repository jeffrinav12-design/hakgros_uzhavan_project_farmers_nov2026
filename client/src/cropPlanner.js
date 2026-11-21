const cropCalendarTemplates = {
  Rice: [
    'Land Preparation',
    'Seed Selection',
    'Sowing / Transplanting',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
  Wheat: [
    'Land Preparation',
    'Seed Selection',
    'Sowing',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
  Maize: [
    'Land Preparation',
    'Seed Selection',
    'Sowing',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
  Tomato: [
    'Land Preparation',
    'Seed Selection',
    'Transplanting',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
  Cotton: [
    'Land Preparation',
    'Seed Selection',
    'Sowing',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
  Banana: [
    'Land Preparation',
    'Planting',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ],
};

const getTaskStatus = (plannedDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(plannedDate);
  taskDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(taskDate.getTime())) {
    return 'Upcoming';
  }

  const diffDays = Math.round((taskDate - today) / 86400000);

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  return 'Upcoming';
};

export function buildCropCalendar({ crop, season, plantingDate, waterAvailability, soilType, location }) {
  const cropName = crop || 'Crop';
  const baseStages = cropCalendarTemplates[cropName] || [
    'Land Preparation',
    'Seed Selection',
    'Sowing',
    'Fertilization',
    'Irrigation',
    'Pest / Disease Monitoring',
    'Harvest',
  ];

  const baseDate = plantingDate ? new Date(plantingDate) : new Date();

  return baseStages.map((stage, index) => {
    const stageDate = new Date(baseDate);
    stageDate.setDate(stageDate.getDate() + index * 14);

    const recommendations = [];

    if (waterAvailability === 'Limited') {
      recommendations.push('Limited water: review irrigation timing and prioritise critical crop stages.');
    } else if (waterAvailability === 'Adequate') {
      recommendations.push('Water availability appears adequate for the planned schedule.');
    }

    if (soilType && /sandy|loam/i.test(soilType)) {
      recommendations.push('Soil texture suggests regular monitoring for moisture and nutrient movement.');
    }

    if (location) {
      recommendations.push(`Local conditions for ${location} should be reviewed before final operational decisions.`);
    }

    if (season) {
      recommendations.push(`${season} seasonal guidance should be matched with the crop stage calendar.`);
    }

    return {
      stage,
      date: stageDate.toISOString().slice(0, 10),
      plannedDate: stageDate.toISOString(),
      status: getTaskStatus(stageDate),
      advice: recommendations.length ? recommendations.join(' ') : 'Follow crop management best practices and local agronomic advice.',
    };
  });
}
