import test from "node:test";
import assert from "node:assert/strict";
import { buildCasteStrengthSummary, formatVacancy, normalizeCasteCategory } from "./strengthLogic.js";

test("normalizeCasteCategory normalizes Master Excel caste columns cleanly", () => {
  assert.equal(normalizeCasteCategory({ "CAST CATEGORY": "general" }), "GEN");
  assert.equal(normalizeCasteCategory({ CATEGORY: "OBC" }), "OBC");
  assert.equal(normalizeCasteCategory({ CAT: "MBC" }), "MBC");
  assert.equal(normalizeCasteCategory({ CASTE: "EWS" }), "EWS");
  assert.equal(normalizeCasteCategory({ CATEGORY: "SC" }), "SC");
  assert.equal(normalizeCasteCategory({ CATEGORY: "ST" }), "ST");
  assert.equal(normalizeCasteCategory({ NAME: "Blank" }), "UNSPECIFIED");
});

test("buildCasteStrengthSummary aggregates GEN/OBC/MBC/EWS/SC/ST rank and gender totals", () => {
  const sample = [
    { NAME: "A", CADER: "FC", CATEGORY: "GEN", GENDER: "MALE" },
    { NAME: "B", CADER: "HC", "CAST CATEGORY": "OBC", GENDER: "FEMALE" },
    { NAME: "C", CADER: "SI", CATEGORY: "SC", GENDER: "MALE" },
    { NAME: "D", CADER: "Jr. Asst", CATEGORY: "ST", GENDER: "FEMALE" }
  ];
  const summary = buildCasteStrengthSummary(sample);
  const gen = summary.find((r) => r.category === "GEN");
  const obc = summary.find((r) => r.category === "OBC");
  const st = summary.find((r) => r.category === "ST");

  assert.equal(gen.male, 1);
  assert.equal(gen.ranks.FC, 1);
  assert.equal(obc.female, 1);
  assert.equal(obc.ranks.HC, 1);
  assert.equal(st.ranks.SUPPORT, 1);
  assert.equal(formatVacancy(10, 12), "+2");
});
