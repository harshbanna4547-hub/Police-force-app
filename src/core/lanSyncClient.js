export const OFFICE_SERVER_URL_KEY = "police_gr_server_url";
export const OFFICE_SERVER_TOKEN_KEY = "police_gr_server_token";

const OFFICE_DISTRICT_ID = "CHITTORGARH";
const DEFAULT_TIMEOUT_MS = 1200;

export class OfficeServerError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "OfficeServerError";
    this.code = code;
  }
}

function getDefaultServerUrl() {
  const configuredUrl = String(import.meta.env.VITE_GR_SERVER_URL || "").trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.hostname) {
    return `http://${window.location.hostname}:5050`;
  }
  return "";
}

export function getOfficeServerConfig() {
  const storedUrl = window.localStorage.getItem(OFFICE_SERVER_URL_KEY);
  const storedToken = window.localStorage.getItem(OFFICE_SERVER_TOKEN_KEY);
  return {
    url: String(storedUrl || getDefaultServerUrl()).trim().replace(/\/+$/, ""),
    token: String(storedToken || "").trim()
  };
}

export function saveOfficeServerConfig(urlValue, tokenValue) {
  let url;
  try {
    url = new URL(String(urlValue || "").trim());
  } catch {
    throw new OfficeServerError("GR सर्वर का URL सही नहीं है।", "CONFIG_INVALID");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new OfficeServerError("GR सर्वर URL में केवल http(s)://IP:5050 दर्ज करें।", "CONFIG_INVALID");
  }

  const token = String(tokenValue || "").trim();
  if (token.length < 32) {
    throw new OfficeServerError("Office Access Key कम-से-कम 32 अक्षर की होनी चाहिए।", "CONFIG_INVALID");
  }

  window.localStorage.setItem(OFFICE_SERVER_URL_KEY, url.origin);
  window.localStorage.setItem(OFFICE_SERVER_TOKEN_KEY, token);
  return { url: url.origin, token };
}

export function clearOfficeServerConfig() {
  window.localStorage.removeItem(OFFICE_SERVER_URL_KEY);
  window.localStorage.removeItem(OFFICE_SERVER_TOKEN_KEY);
}

async function requestOfficeApi(path, { method = "GET", payload, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const { url, token } = getOfficeServerConfig();
  if (!url || !token) {
    throw new OfficeServerError("GR सर्वर URL और Office Access Key सेट करें।", "CONFIG_MISSING");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(payload ? { "Content-Type": "application/json" } : {})
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal
    });
  } catch (error) {
    const message = error.name === "AbortError"
      ? "GR सर्वर ने समय पर जवाब नहीं दिया।"
      : "GR सर्वर उपलब्ध नहीं है।";
    throw new OfficeServerError(message, "OFFLINE");
  } finally {
    window.clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new OfficeServerError("Office Access Key अस्वीकार हुई।", "AUTH_REQUIRED");
  }
  if (response.status === 409) {
    let conflictMessage = "GR सर्वर पर नया डेटा मौजूद है।";
    try {
      const body = await response.json();
      conflictMessage = body.error || conflictMessage;
    } catch {
      // The HTTP status still identifies a version conflict.
    }
    throw new OfficeServerError(conflictMessage, "CONFLICT");
  }
  if (!response.ok) {
    throw new OfficeServerError(`GR सर्वर अनुरोध असफल हुआ (${response.status})।`, "HTTP_ERROR");
  }
  try {
    return await response.json();
  } catch {
    throw new OfficeServerError("GR सर्वर से अमान्य JSON उत्तर मिला।", "INVALID_RESPONSE");
  }
}

export function fetchOfficeDistrictData(districtId = OFFICE_DISTRICT_ID, options) {
  if (String(districtId).toUpperCase() !== OFFICE_DISTRICT_ID) {
    throw new OfficeServerError("LAN सर्वर केवल Chittorgarh जिले के लिए उपलब्ध है।", "DISTRICT_UNSUPPORTED");
  }
  return requestOfficeApi(`/api/data/${OFFICE_DISTRICT_ID}`, options);
}

export async function saveOfficeDistrictData(districtId, payload, options) {
  if (String(districtId).toUpperCase() !== OFFICE_DISTRICT_ID) {
    throw new OfficeServerError("LAN सर्वर केवल Chittorgarh जिले के लिए उपलब्ध है।", "DISTRICT_UNSUPPORTED");
  }
  return requestOfficeApi(`/api/data/${OFFICE_DISTRICT_ID}`, {
    ...options,
    method: "POST",
    payload: { payload }
  });
}

export async function synchronizeOfficeVault(districtId, localVault, storageVaultItems = []) {
  let remote = await fetchOfficeDistrictData(districtId);
  const localTimestamp = Date.parse(localVault?.updatedAt || "") || 0;
  const remoteTimestamp = Date.parse(remote.updatedAt || remote.payload?.updatedAt || "") || 0;

  if (remote.payload && (!localVault || remoteTimestamp > localTimestamp)) {
    return { direction: "pull", vault: remote.payload, updatedAt: remote.updatedAt };
  }
  if (!localVault && !remote.payload) {
    return { direction: "current", vault: null, updatedAt: null };
  }
  if (!remote.payload || localTimestamp > remoteTimestamp) {
    const payload = {
      ...localVault,
      storageVaultItems,
      updatedAt: localVault.updatedAt || new Date().toISOString()
    };
    try {
      const saved = await saveOfficeDistrictData(districtId, payload);
      return { direction: "push", vault: payload, updatedAt: saved.updatedAt };
    } catch (error) {
      if (error.code === "CONFLICT") return { direction: "conflict", vault: localVault };
      throw error;
    }
  }
  return { direction: "current", vault: localVault, updatedAt: localVault.updatedAt };
}
