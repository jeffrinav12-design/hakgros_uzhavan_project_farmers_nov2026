import { diagnoseCropStress } from "./cropDecisionEngine";

test("returns bilingual, crop-aware fungal guidance for humid leaf spots", () => {
  const result = diagnoseCropStress({
    crop: "Paddy",
    symptoms: "brown spots",
    temperature: 29,
    humidity: 90,
  });

  expect(result).toContain("Possible leaf-spot or blight symptoms / இலைப்புள்ளி");
  expect(result).toContain("Paddy / நெல்");
  expect(result).toContain("biofungicide");
  expect(result).toContain("டிரைக்கோடெர்மா");
});

test("uses weather context when symptoms are not specific", () => {
  const result = diagnoseCropStress({
    crop: "Tea",
    symptoms: "",
    temperature: 36,
    humidity: 88,
  });

  expect(result).toContain("Possible weather-related crop stress");
  expect(result).toContain("தேயிலை");
  expect(result).toContain("High temperature and high humidity");
});

test.each([
  ["Tea", "தேயிலை"],
  ["Banana", "வாழை"],
  ["Pepper", "மிளகு"],
  ["Tomato", "தக்காளி"],
])("recognizes %s in bilingual diagnoses", (crop, tamilName) => {
  const result = diagnoseCropStress({ crop, symptoms: "", temperature: 28, humidity: 70 });

  expect(result).toContain(`${crop} / ${tamilName}`);
});
