import assert from "node:assert/strict";
import test from "node:test";
import { formatDateOnly } from "./commonFunctions.js";

test("formats date values without a time component", () => {
  assert.equal(formatDateOnly("2026-11-24T00:00:00.000Z"), "24-11-2026");
  assert.equal(formatDateOnly("7/2/2025 09:30"), "07-02-2025");
  assert.equal(formatDateOnly(""), "-");
});
