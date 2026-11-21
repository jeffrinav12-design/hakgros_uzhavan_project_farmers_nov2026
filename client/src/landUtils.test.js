import { convertArea, getAreaSummary, interpretSoilPh } from './landUtils';

describe('area conversion', () => {
  test('1 acre equals 100 cent exactly', () => {
    expect(convertArea(1, 'Acre', 'Cent')).toBe(100);
  });

  test('0.5 acre equals 50 cent', () => {
    expect(convertArea(0.5, 'Acre', 'Cent')).toBe(50);
  });

  test('2 acres equals 200 cent', () => {
    expect(convertArea(2, 'Acre', 'Cent')).toBe(200);
  });

  test('25 cent equals 0.25 acre', () => {
    expect(convertArea(25, 'Cent', 'Acre')).toBeCloseTo(0.25, 5);
  });

  test('75 cent equals 0.75 acre', () => {
    expect(convertArea(75, 'Cent', 'Acre')).toBeCloseTo(0.75, 5);
  });

  test('area summary includes hectare and square meter values', () => {
    const summary = getAreaSummary(2, 'Acre');
    expect(summary.cent).toBe(200);
    expect(summary.hectare).toBeCloseTo(0.8094, 4);
    expect(summary.squareMeter).toBeCloseTo(8093.71, 2);
  });
});

describe('soil pH', () => {
  test('below 5.5 is strongly acidic', () => {
    expect(interpretSoilPh(5.2)).toBe('Strongly acidic');
  });

  test('6.8 is near neutral', () => {
    expect(interpretSoilPh(6.8)).toBe('Near neutral');
  });

  test('9.1 is strongly alkaline', () => {
    expect(interpretSoilPh(9.1)).toBe('Strongly alkaline');
  });
});
