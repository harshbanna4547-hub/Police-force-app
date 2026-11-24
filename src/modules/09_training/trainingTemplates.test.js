import test from "node:test";
import assert from "node:assert/strict";
import { renderTrainingDocument } from "./trainingTemplates.js";

test("wireless template renders the nine required employee details with safe HTML", () => {
  const html = renderTrainingDocument("WIRELESS", {
    NAME: "<Officer>",
    "FATHER NAME": "Parent",
    CADER: "SI",
    "BELT NO": "123",
    POSTING: "PS One",
    MOBILE: "9999999999",
    EMAIL: "test@example.com",
    EDUCATION: "Graduate",
    DOB: "01-01-1990",
    COURSE_NAME: "Cyber",
    INSTITUTE: "RPA",
    FROM_DATE: "2026-01-01",
    TO_DATE: "2026-01-05"
  });
  assert.equal((html.match(/<tr>/g) || []).length, 9);
  assert.match(html, /&lt;Officer&gt;/);
  assert.match(html, /DevLys 010/);
  assert.match(html, /Times New Roman/);
});
