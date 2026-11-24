export const OFFLINE_DEMO_EMAIL = "sp.chittorgarh@police.gov.in";
export const OFFLINE_DEMO_PASSWORD = "Chittorgarh@123";
export const OFFLINE_DEMO_DISTRICT_ID = "CHITTORGARH_OFFLINE_DEMO";
export const OFFLINE_DEMO_DISTRICT_NAME = "Chittorgarh (Offline Demo)";
export const OFFLINE_AUTH_STORAGE_KEY = "police_portal_offline_demo_auth";

const VALID_USERNAMES = new Set([OFFLINE_DEMO_EMAIL, "admin"]);
const VALID_PASSWORDS = new Set([OFFLINE_DEMO_PASSWORD, "123456"]);

export function isOfflineDemoCredentialsValid(email, password) {
  const username = String(email || "").trim().toLowerCase();
  return VALID_USERNAMES.has(username) && VALID_PASSWORDS.has(String(password || ""));
}

export function createOfflineDemoIdentity() {
  const user = {
    id: "offline-demo-admin",
    email: OFFLINE_DEMO_EMAIL
  };
  const profile = {
    user_id: user.id,
    district_id: OFFLINE_DEMO_DISTRICT_ID,
    district_name: OFFLINE_DEMO_DISTRICT_NAME,
    role: "admin",
    offline_demo: true
  };
  return { user, profile };
}
