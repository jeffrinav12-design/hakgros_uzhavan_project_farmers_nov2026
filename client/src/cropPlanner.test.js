import { buildCropCalendar } from './cropPlanner';

describe('smart crop planner', () => {
  test('builds a crop calendar with key stages for rice', () => {
    const calendar = buildCropCalendar({
      crop: 'Rice',
      season: 'Kharif',
      plantingDate: '2026-09-26',
      waterAvailability: 'Adequate',
      soilType: 'Clay Loam',
      location: 'Coimbatore',
    });

    expect(calendar.length).toBeGreaterThanOrEqual(6);
    expect(calendar.map((entry) => entry.stage)).toEqual(expect.arrayContaining([
      'Land Preparation',
      'Seed Selection',
      'Sowing / Transplanting',
      'Fertilization',
      'Irrigation',
      'Harvest',
    ]));
  });

  test('adds irrigation guidance when water is limited', () => {
    const calendar = buildCropCalendar({
      crop: 'Tomato',
      season: 'Rabi',
      plantingDate: '2026-11-15',
      waterAvailability: 'Limited',
      soilType: 'Sandy Loam',
      location: 'Coimbatore',
    });

    expect(calendar[0].advice).toContain('Limited water');
    expect(calendar.some((entry) => entry.stage === 'Irrigation')).toBe(true);
  });

  test('builds a planned task timeline with statuses based on sowing date', () => {
    const timeline = buildCropCalendar({
      crop: 'Rice',
      season: 'Kharif',
      plantingDate: '2026-10-15',
      waterAvailability: 'Adequate',
      soilType: 'Clay Loam',
      location: 'Thanjavur',
    });

    expect(timeline.length).toBeGreaterThanOrEqual(7);
    expect(timeline[0]).toMatchObject({
      stage: expect.stringMatching(/Land Preparation|Seed Selection/),
      status: expect.stringMatching(/Upcoming|Due Today|Completed|Overdue/),
    });
    expect(timeline.some((entry) => entry.stage === 'Irrigation')).toBe(true);
  });
});
