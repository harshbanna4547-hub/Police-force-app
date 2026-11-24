import assert from "node:assert/strict";
import test from "node:test";
import {
  createOfflineDemoIdentity,
  isOfflineDemoCredentialsValid,
  OFFLINE_DEMO_EMAIL,
  OFFLINE_DEMO_PASSWORD,
  OFFLINE_DEMO_DISTRICT_ID
} from "./offlineDemoAuth.js";

test("accepts only the documented offline demo credentials", () => {
  assert.equal(isOfflineDemoCredentialsValid(OFFLINE_DEMO_EMAIL, OFFLINE_DEMO_PASSWORD), true);
  assert.equal(isOfflineDemoCredentialsValid("admin", "123456"), true);
  assert.equal(isOfflineDemoCredentialsValid("ADMIN", OFFLINE_DEMO_PASSWORD), true);
  assert.equal(isOfflineDemoCredentialsValid(OFFLINE_DEMO_EMAIL, "wrong-password"), false);
  assert.equal(isOfflineDemoCredentialsValid("other@example.com", "123456"), false);
});

test("uses a separate district identity for offline demo data", () => {
  const { user, profile } = createOfflineDemoIdentity();
  assert.equal(user.id, "offline-demo-admin");
  assert.equal(profile.district_id, OFFLINE_DEMO_DISTRICT_ID);
  assert.equal(profile.offline_demo, true);
});
