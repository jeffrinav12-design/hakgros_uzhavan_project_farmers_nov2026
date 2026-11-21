export const areaFactors = {
  Acre: 4046.8564224,
  Cent: 40.468564224,
  Hectare: 10000,
  SquareMeter: 1,
  SquareFeet: 0.09290304,
};

const normalizeNumericValue = (value) => {
  const numericalValue = Number(value);
  if (!Number.isFinite(numericalValue)) {
    return 0;
  }

  const rounded = Number(numericalValue.toFixed(12));
  return Object.is(rounded, -0) ? 0 : rounded;
};

export function convertArea(value, fromUnit, toUnit) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (fromUnit === toUnit) {
    return normalizeNumericValue(numericValue);
  }

  const squareMeters = numericValue * (areaFactors[fromUnit] ?? 0);
  return normalizeNumericValue(squareMeters / (areaFactors[toUnit] ?? 1));
}

export function getAreaSummary(value, unit) {
  const numericValue = Number(value) || 0;
  const squareMeter = convertArea(numericValue, unit, 'SquareMeter');
  return {
    squareMeter: Number(squareMeter.toFixed(2)),
    hectare: Number(convertArea(numericValue, unit, 'Hectare').toFixed(4)),
    cent: Number(convertArea(numericValue, unit, 'Cent').toFixed(2)),
    acre: Number(convertArea(numericValue, unit, 'Acre').toFixed(4)),
  };
}

export function interpretSoilPh(phValue) {
  const ph = Number(phValue);
  if (!Number.isFinite(ph) || ph <= 0) {
    return 'Not available';
  }
  if (ph < 5.5) return 'Strongly acidic';
  if (ph < 6.5) return 'Acidic to slightly acidic';
  if (ph <= 7.5) return 'Near neutral';
  if (ph <= 8.5) return 'Alkaline';
  return 'Strongly alkaline';
}
