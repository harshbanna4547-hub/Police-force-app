import { randomBytes, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SERVER_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REFRESH_TOKEN_FILE = path.join(SERVER_DIRECTORY, "data", "onedrive.refresh.token");
const GRAPH_API = "https://graph.microsoft.com/v1.0";
const TOKEN_ENDPOINT_BASE = "https://login.microsoftonline.com";
const STORAGE_FILE_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsm", ".xlsb", ".xlt", ".xltx", ".xltm", ".csv", ".pdf"]);

function loadEnvironmentFile() {
  const environmentFile = path.resolve(SERVER_DIRECTORY, "..", ".env");
  if (!existsSync(environmentFile)) return;
  for (const line of readFileSync(environmentFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    process.env[match[1]] = value;
  }
}

loadEnvironmentFile();

export function normalizeOneDriveDistrict(value) {
  const district = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,60}$/.test(district)) {
    const error = new Error("जिला पहचान अमान्य है।");
    error.status = 400;
    throw error;
  }
  return district;
}

function safeStorageFileName(value) {
  const fileName = String(value || "").trim();
  const containsControlCharacter = Array.from(fileName).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!fileName || fileName.length > 200 || /[\\/:*?"<>|]/.test(fileName) || containsControlCharacter) {
    const error = new Error("Storage फ़ाइल का नाम अमान्य है।");
    error.status = 400;
    throw error;
  }
  if (!STORAGE_FILE_EXTENSIONS.has(path.extname(fileName).toLowerCase())) {
    const error = new Error("केवल Excel, CSV और PDF फ़ाइलें OneDrive Storage में सिंक होती हैं।");
    error.status = 400;
    throw error;
  }
  return fileName;
}

function isBackupFileName(fileName, district) {
  return new RegExp(`^Backup_${district}_\\d{2}-\\d{2}-\\d{4}_\\d{2}-\\d{2}\\.json$`, "i")
    .test(String(fileName || ""));
}

function makeError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function createOneDriveBackendBridge({
  env = process.env,
  fetchImpl = globalThis.fetch,
  refreshTokenFile = REFRESH_TOKEN_FILE,
  databasePathForDistrict = (district) => `PoliceForcePortal/${district}/${district}_db.json`
} = {}) {
  let accessToken = "";
  let accessTokenExpiresAt = 0;
  let tokenRefreshInFlight = null;
  const databaseWriteQueues = new Map();
  let activeDevicesWriteQueue = Promise.resolve();
  const pendingAuthStates = new Map();

  function getTenant() {
    return String(env.ONEDRIVE_TENANT_ID || "common").trim();
  }

  function getClientCredentials() {
    const clientId = String(env.ONEDRIVE_CLIENT_ID || "").trim();
    const clientSecret = String(env.ONEDRIVE_CLIENT_SECRET || "").trim();
    const redirectUri = String(env.ONEDRIVE_REDIRECT_URI || "").trim();
    if (!clientId || !clientSecret) {
      throw makeError("OneDrive server configuration is incomplete. Set ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET.", 503);
    }
    return { clientId, clientSecret, redirectUri };
  }

  async function getRefreshToken() {
    try {
      const savedToken = (await readFile(refreshTokenFile, "utf8")).trim();
      if (savedToken) return savedToken;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return String(env.ONEDRIVE_REFRESH_TOKEN || "").trim();
  }

  async function persistRefreshToken(refreshToken) {
    await mkdir(path.dirname(refreshTokenFile), { recursive: true });
    const temporaryFile = `${refreshTokenFile}.${randomBytes(12).toString("hex")}.tmp`;
    try {
      await writeFile(temporaryFile, `${refreshToken}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporaryFile, refreshTokenFile);
    } catch (error) {
      await rm(temporaryFile, { force: true });
      throw error;
    }
    env.ONEDRIVE_REFRESH_TOKEN = refreshToken;
  }

  async function exchangeToken(parameters) {
    const { clientId, clientSecret } = getClientCredentials();
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...parameters
    });
    const response = await fetchImpl(`${TOKEN_ENDPOINT_BASE}/${encodeURIComponent(getTenant())}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token) {
      throw makeError(`Microsoft token request failed (${response.status}).`, response.status === 400 ? 401 : 502);
    }
    return result;
  }

  async function getAccessToken() {
    if (accessToken && accessTokenExpiresAt > Date.now() + 60_000) return accessToken;
    if (tokenRefreshInFlight) return tokenRefreshInFlight;
    tokenRefreshInFlight = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        throw makeError("OneDrive is not connected. Complete the one-time /api/onedrive/auth-init setup.", 503);
      }
      const result = await exchangeToken({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "offline_access Files.ReadWrite.All"
      });
      if (result.refresh_token && result.refresh_token !== refreshToken) {
        await persistRefreshToken(result.refresh_token);
      }
      accessToken = result.access_token;
      accessTokenExpiresAt = Date.now() + Math.max(60, Number(result.expires_in) || 3600) * 1000;
      return accessToken;
    })();
    try {
      return await tokenRefreshInFlight;
    } finally {
      tokenRefreshInFlight = null;
    }
  }

  async function graphRequest(url, options = {}, canRetry = true) {
    const token = await getAccessToken();
    const response = await fetchImpl(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` }
    });
    if (response.status === 401 && canRetry) {
      accessToken = "";
      accessTokenExpiresAt = 0;
      await getAccessToken();
      return graphRequest(url, options, false);
    }
    return response;
  }

  async function requireSuccess(response, message) {
    if (response.ok) return response;
    const status = response.status === 404 ? 404 : response.status === 409 ? 409 : 502;
    throw makeError(`${message} (${response.status}).`, status);
  }

  async function readGraphCollection(url, message) {
    const items = [];
    let nextUrl = url;
    while (nextUrl) {
      const response = await graphRequest(nextUrl);
      if (response.status === 404) return [];
      await requireSuccess(response, message);
      const page = await response.json();
      items.push(...(Array.isArray(page.value) ? page.value : []));
      nextUrl = page["@odata.nextLink"] || "";
      if (nextUrl) {
        const parsedNextUrl = new URL(nextUrl);
        if (parsedNextUrl.origin !== new URL(GRAPH_API).origin || !parsedNextUrl.pathname.startsWith("/v1.0/")) {
          throw makeError("OneDrive returned an invalid pagination URL.");
        }
      }
    }
    return items;
  }

  function districtDatabasePath(district) {
    return databasePathForDistrict(normalizeOneDriveDistrict(district));
  }

  async function ensureFolderPath(segments) {
    let parentId = "root";
    for (const name of segments) {
      const base = parentId === "root"
        ? `${GRAPH_API}/me/drive/root/children`
        : `${GRAPH_API}/me/drive/items/${encodeURIComponent(parentId)}/children`;
      const children = await readGraphCollection(`${base}?$select=id,name,folder`, "OneDrive folder lookup failed");
      let folder = children.find((item) => item.name === name && item.folder);
      if (!folder) {
        const created = await graphRequest(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail"
          })
        });
        if (created.status === 409) {
          const refreshed = await readGraphCollection(`${base}?$select=id,name,folder`, "OneDrive folder lookup failed");
          folder = refreshed.find((item) => item.name === name && item.folder);
        } else {
          await requireSuccess(created, "OneDrive folder creation failed");
          folder = await created.json();
        }
      }
      if (!folder?.id) throw makeError("OneDrive folder could not be resolved.");
      parentId = folder.id;
    }
    return parentId;
  }

  async function readDistrictDatabase(district) {
    const relativePath = districtDatabasePath(district);
    const response = await graphRequest(`${GRAPH_API}/me/drive/root:/${relativePath}:/content`);
    if (response.status === 404) return null;
    await requireSuccess(response, "OneDrive database download failed");
    try {
      const database = await response.json();
      if (!database || typeof database !== "object" || Array.isArray(database) || !database.payload || typeof database.payload !== "object") {
        throw new Error("Invalid database format.");
      }
      return {
        district: normalizeOneDriveDistrict(district),
        payload: database.payload,
        updatedAt: database.updatedAt || database.payload.updatedAt || null
      };
    } catch (error) {
      if (error instanceof SyntaxError || error.message === "Invalid database format.") {
        throw makeError("OneDrive database contains invalid JSON or an invalid structure.", 502);
      }
      throw error;
    }
  }

  async function getConfigurationStatus() {
    const refreshToken = await getRefreshToken();
    return {
      clientIdConfigured: Boolean(String(env.ONEDRIVE_CLIENT_ID || "").trim()),
      clientSecretConfigured: Boolean(String(env.ONEDRIVE_CLIENT_SECRET || "").trim()),
      refreshTokenConfigured: Boolean(refreshToken),
      redirectUriConfigured: Boolean(String(env.ONEDRIVE_REDIRECT_URI || "").trim())
    };
  }

  async function readActiveDevices() {
    const response = await graphRequest(`${GRAPH_API}/me/drive/root:/PoliceForcePortal/active_devices.json:/content`);
    if (response.status === 404) return [];
    await requireSuccess(response, "OneDrive active-device listing failed");
    let data;
    try {
      data = await response.json();
    } catch {
      throw makeError("OneDrive active-device file contains invalid JSON.");
    }
    if (!data || !Array.isArray(data.devices)) {
      throw makeError("OneDrive active-device file has an invalid structure.");
    }
    return data.devices;
  }

  function validateActiveDevice(district, device) {
    const deviceId = String(device?.deviceId || "").trim();
    const name = String(device?.name || "").trim();
    const validScreens = new Set(["Desktop", "Tablet", "Mobile", "Unknown"]);
    const lastDataUpdatedAt = String(device?.lastDataUpdatedAt || "");
    if (!/^[A-Za-z0-9._-]{8,128}$/.test(deviceId) || !name || name.length > 80) {
      throw makeError("Device ID or name is invalid.", 400);
    }
    if (!validScreens.has(device.screenType)) {
      throw makeError("Device screen type is invalid.", 400);
    }
    if (lastDataUpdatedAt && !Number.isFinite(Date.parse(lastDataUpdatedAt))) {
      throw makeError("Device data timestamp is invalid.", 400);
    }
    return {
      deviceId,
      name,
      district: normalizeOneDriveDistrict(district),
      os: String(device.os || "Unknown").slice(0, 40),
      browser: String(device.browser || "Unknown").slice(0, 40),
      screenType: device.screenType,
      lastActiveAt: new Date().toISOString(),
      lastDataUpdatedAt: lastDataUpdatedAt || null
    };
  }

  function upsertActiveDevice(district, device) {
    const record = validateActiveDevice(district, device);
    const update = activeDevicesWriteQueue.then(async () => {
      const devices = await readActiveDevices();
      const updatedDevices = [
        ...devices.filter((item) => item.deviceId !== record.deviceId),
        record
      ].sort((first, second) => Date.parse(second.lastActiveAt) - Date.parse(first.lastActiveAt));
      const filePath = "PoliceForcePortal/active_devices.json";
      await ensureFolderPath(["PoliceForcePortal"]);
      const response = await graphRequest(`${GRAPH_API}/me/drive/root:/${filePath}:/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devices: updatedDevices, updatedAt: new Date().toISOString() })
      });
      await requireSuccess(response, "OneDrive active-device update failed");
      return updatedDevices;
    });
    activeDevicesWriteQueue = update.catch(() => undefined);
    return update;
  }

  async function writeDistrictDatabaseNow(normalizedDistrict, payload) {
    const current = await readDistrictDatabase(normalizedDistrict);
    const updatedAt = new Date(Date.parse(payload.updatedAt || "") || Date.now()).toISOString();
    if (current && (Date.parse(current.updatedAt || "") || 0) > Date.parse(updatedAt)) {
      const error = makeError("A newer OneDrive version already exists.", 409);
      error.code = "CONFLICT";
      throw error;
    }
    const filePath = districtDatabasePath(normalizedDistrict);
    await ensureFolderPath(filePath.split("/").slice(0, -1));
    const response = await graphRequest(`${GRAPH_API}/me/drive/root:/${filePath}:/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ district: normalizedDistrict, payload, updatedAt })
    });
    await requireSuccess(response, "OneDrive database upload failed");
    return { district: normalizedDistrict, updatedAt };
  }

  function writeDistrictDatabase(district, payload) {
    const normalizedDistrict = normalizeOneDriveDistrict(district);
    const previousWrite = databaseWriteQueues.get(normalizedDistrict) || Promise.resolve();
    const write = previousWrite.then(() => writeDistrictDatabaseNow(normalizedDistrict, payload));
    const queuedWrite = write.catch(() => undefined);
    databaseWriteQueues.set(normalizedDistrict, queuedWrite);
    return write.finally(() => {
      if (databaseWriteQueues.get(normalizedDistrict) === queuedWrite) {
        databaseWriteQueues.delete(normalizedDistrict);
      }
    });
  }

  async function listStorageFiles(district) {
    const normalizedDistrict = normalizeOneDriveDistrict(district);
    const folderPath = `PoliceForcePortal/${normalizedDistrict}/Storage`;
    const rootItems = await readGraphCollection(
      `${GRAPH_API}/me/drive/root:/${folderPath}:/children?$select=id,name,size,lastModifiedDateTime,file`,
      "OneDrive Storage listing failed"
    );
    const backupFolder = rootItems.find((item) => item.folder && item.name === "Backup");
    const backupItems = backupFolder
      ? await readGraphCollection(
        `${GRAPH_API}/me/drive/items/${encodeURIComponent(backupFolder.id)}/children?$select=id,name,size,lastModifiedDateTime,file`,
        "OneDrive Storage Backup listing failed"
      )
      : [];
    const rootFiles = rootItems
      .filter((item) => item.file && STORAGE_FILE_EXTENSIONS.has(path.extname(item.name || "").toLowerCase()))
      .map((item) => ({ ...item, storageFolder: "" }));
    const backupFiles = backupItems
      .filter((item) => item.file && isBackupFileName(item.name, normalizedDistrict))
      .map((item) => ({ ...item, storageFolder: "Backup" }));
    return [...rootFiles, ...backupFiles].map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        mime: item.file.mimeType || "application/octet-stream",
        updatedAt: item.lastModifiedDateTime || null,
        folder: item.storageFolder
      }));
  }

  async function downloadStorageFile(district, fileId) {
    normalizeOneDriveDistrict(district);
    if (!String(fileId || "").trim() || String(fileId).length > 512) {
      throw makeError("OneDrive Storage फ़ाइल पहचान अमान्य है।", 400);
    }
    const response = await graphRequest(`${GRAPH_API}/me/drive/items/${encodeURIComponent(fileId)}/content`);
    await requireSuccess(response, "OneDrive Storage download failed");
    return Buffer.from(await response.arrayBuffer());
  }

  async function uploadStorageFile(district, { fileName, contentType, data, folder = "" }) {
    const normalizedDistrict = normalizeOneDriveDistrict(district);
    if (folder && folder !== "Backup") {
      throw makeError("OneDrive Storage folder is invalid.", 400);
    }
    let safeName;
    if (folder === "Backup") {
      safeName = String(fileName || "").trim();
      if (!isBackupFileName(safeName, normalizedDistrict) || safeName.length > 200) {
        throw makeError("Storage Backup फ़ाइल का नाम अमान्य है।", 400);
      }
    } else {
      safeName = safeStorageFileName(fileName);
    }
    if (!Buffer.isBuffer(data) || data.byteLength > 250_000_000) {
      throw makeError("Storage फ़ाइल डेटा अमान्य या बहुत बड़ा है।", 400);
    }
    const parentId = await ensureFolderPath([
      "PoliceForcePortal",
      normalizedDistrict,
      "Storage",
      ...(folder === "Backup" ? ["Backup"] : [])
    ]);
    const response = await graphRequest(`${GRAPH_API}/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(safeName)}:/content`, {
      method: "PUT",
      headers: { "Content-Type": String(contentType || "application/octet-stream") },
      body: data
    });
    await requireSuccess(response, "OneDrive Storage upload failed");
    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      size: result.size,
      updatedAt: result.lastModifiedDateTime || null
    };
  }

  async function createAuthUrl() {
    const { clientId, redirectUri } = getClientCredentials();
    if (!redirectUri) {
      throw makeError("Set ONEDRIVE_REDIRECT_URI before starting OneDrive authorization.", 503);
    }
    if (await getRefreshToken()) {
      throw makeError("A OneDrive refresh token is already configured.", 409);
    }
    const state = randomBytes(32).toString("base64url");
    pendingAuthStates.set(state, Date.now() + 10 * 60 * 1000);
    const authorizationUrl = new URL(`${TOKEN_ENDPOINT_BASE}/${encodeURIComponent(getTenant())}/oauth2/v2.0/authorize`);
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: "offline_access Files.ReadWrite.All",
      state
    }).toString();
    return { authorizationUrl: authorizationUrl.toString() };
  }

  async function completeAuth({ code, state }) {
    const expiresAt = pendingAuthStates.get(String(state || ""));
    if (!expiresAt || expiresAt < Date.now()) {
      pendingAuthStates.delete(String(state || ""));
      throw makeError("OneDrive authorization state is invalid or expired.", 400);
    }
    pendingAuthStates.delete(String(state));
    const { redirectUri } = getClientCredentials();
    const result = await exchangeToken({
      grant_type: "authorization_code",
      code: String(code || ""),
      redirect_uri: redirectUri,
      scope: "offline_access Files.ReadWrite.All"
    });
    if (!result.refresh_token) throw makeError("Microsoft did not return a refresh token. Verify the offline_access permission.", 502);
    await persistRefreshToken(result.refresh_token);
    accessToken = result.access_token;
    accessTokenExpiresAt = Date.now() + Math.max(60, Number(result.expires_in) || 3600) * 1000;
    return { connected: true };
  }

  return {
    readDistrictDatabase,
    writeDistrictDatabase,
    getConfigurationStatus,
    readActiveDevices,
    upsertActiveDevice,
    listStorageFiles,
    downloadStorageFile,
    uploadStorageFile,
    createAuthUrl,
    completeAuth
  };
}

export function matchesOneDriveAccessToken(candidate, expected) {
  const provided = Buffer.from(String(candidate || ""));
  const configured = Buffer.from(String(expected || ""));
  return provided.length > 0
    && provided.length === configured.length
    && timingSafeEqual(provided, configured);
}
