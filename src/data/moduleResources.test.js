import test from "node:test";
import assert from "node:assert/strict";
import { ALL_GOVT_PORTALS, GOVT_PORTALS, MODULE_ARTICLES } from "./moduleResources.js";

test("ALL_GOVT_PORTALS includes SSO, RajKaj, IFMS 3.0, Finance Dept, and iGOT with valid https URLs", () => {
  assert.ok(GOVT_PORTALS.SSO.url.startsWith("https://"));
  assert.ok(GOVT_PORTALS.RAJKAJ.url.startsWith("https://"));
  assert.ok(GOVT_PORTALS.IFMS.url.startsWith("https://"));
  assert.ok(GOVT_PORTALS.FINANCE.url.startsWith("https://"));
  assert.ok(GOVT_PORTALS.IGOT.url.startsWith("https://"));
  assert.ok(ALL_GOVT_PORTALS.length >= 7);
});

test("MODULE_ARTICLES covers all operational modules with valid portal references", () => {
  ["STRENGTH", "POSTING", "TRANSFER", "LEAVE", "ACP", "PROMOTION", "SENIORITY", "BHARTI", "INCREMENT", "TRAINING", "PUNISHMENT", "ROSTER", "REPORTS"].forEach((id) => {
    const spec = MODULE_ARTICLES[id];
    assert.ok(spec, `Missing MODULE_ARTICLES entry for ${id}`);
    assert.ok(spec.enArticle.length > 20 && spec.hiArticle.length > 20);
    spec.portals.forEach((pId) => assert.ok(GOVT_PORTALS[pId], `Unknown portal ${pId} in ${id}`));
  });
});
