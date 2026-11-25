import {
  InteractionRequiredAuthError,
  PublicClientApplication
} from "@azure/msal-browser";

const CLIENT_ID = import.meta.env?.VITE_ONEDRIVE_CLIENT_ID || "";
const AUTHORITY = "https://login.microsoftonline.com/common";
const GRAPH_API = "https://graph.microsoft.com/v1.0";
const GRAPH_SCOPES = ["Files.ReadWrite", "User.Read"];
const PORTAL_FOLDER = "PoliceForcePortal";
const STORAGE_EXTENSIONS = /\.(xlsx?|xlsm|xlsb|xltx?|xltm|csv|pdf)$/i;

let clientPromise;

export class OneDriveSyncError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "OneDriveSyncError";
    this.code = code;
  }
}

function getClient() {
  if (!CLIENT_ID) {
    throw new OneDriveSyncError("VITE_ONEDRIVE_CLIENT_ID कॉन्फ़िगर नहीं है।", "CONFIG_MISSING");
  }
  if (!clientPromise) {
    const client = new PublicClientApplication({
      auth: { clientId: CLIENT_ID, authority: AUTHORITY },
      cache: { cacheLocation: "localStorage" }
    });
    clientPromise = client.initialize()
      .then(async () => {
        const redirectResult = await client.handleRedirectPromise();
        const account = redirectResult?.account || client.getActiveAccount() || client.getAllAccounts()[0];
        if (account) client.setActiveAccount(account);
        return client;
      })
      .catch((error) => {
        clientPromise = undefined;
        throw new OneDriveSyncError(`Microsoft sign-in शुरू नहीं हो सका: ${error.message}`, "AUTH_ERROR");
      });
  }
  return clientPromise;
}

async function getAccessToken() {
  const client = await getClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  if (!account) {
    throw new OneDriveSyncError("OneDrive से कनेक्ट करें।", "AUTH_REQUIRED");
  }
  client.setActiveAccount(account);
  try {
    const result = await client.acquireTokenSilent({ account, scopes: GRAPH_SCOPES });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      throw new OneDriveSyncError("OneDrive पर फिर से साइन इन करें।", "AUTH_REQUIRED");
    }
    throw new OneDriveSyncError(`OneDrive access token नहीं मिला: ${error.message}`, "AUTH_ERROR");
  }
}

export async function authenticateOneDriveAccount() {
  const client = await getClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  if (account) {
    client.setActiveAccount(account);
    try {
      await client.acquireTokenSilent({ account, scopes: GRAPH_SCOPES });
      return account;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw new OneDriveSyncError(`OneDrive sign-in असफल: ${error.message}`, "AUTH_ERROR");
      }
      const result = await client.acquireTokenPopup({ account, scopes: GRAPH_SCOPES });
      const selectedAccount = result.account || account;
      client.setActiveAccount(selectedAccount);
      return selectedAccount;
    }
  }

  const result = await client.loginPopup({ scopes: GRAPH_SCOPES });
  if (!result.account) {
    throw new OneDriveSyncError("Microsoft account नहीं चुना गया।", "AUTH_REQUIRED");
  }
  client.setActiveAccount(result.account);
  return result.account;
}

function normalizeDistrict(district) {
  const normalized = String(district || "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,60}$/.test(normalized)) {
    throw new OneDriveSyncError("जिला पहचान अमान्य है।", "DISTRICT_INVALID");
  }
  return normalized;
}

function encodeGraphPath(path) {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function getDistrictDatabasePath(district) {
  return `${PORTAL_FOLDER}/${normalizeDistrict(district)}_master_db.json`;
}

export function getDistrictStoragePath(district) {
  return `${PORTAL_FOLDER}/${normalizeDistrict(district)}/Storage`;
}

function graphItemPath(path) {
  return `/me/drive/root:/${encodeGraphPath(path)}`;
}

async function graphRequest(path, {
  method = "GET",
  body,
  rawBody = false,
  responseType = "json"
} = {}) {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response;
  try {
    response = await fetch(
      path.startsWith("https://") ? path : `${GRAPH_API}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? {
            "Content-Type": rawBody ? "application/octet-stream" : "application/json"
          } : {})
        },
        ...(body !== undefined ? { body } : {}),
        signal: controller.signal
      }
    );
  } catch (error) {
    const message = error.name === "AbortError" ? "OneDrive अनुरोध का समय समाप्त हुआ।" : error.message;
    throw new OneDriveSyncError(`OneDrive उपलब्ध नहीं है: ${message}`, "OFFLINE");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new OneDriveSyncError("OneDrive ने access अस्वीकार किया। Files.ReadWrite अनुमति जाँचें।", "AUTH_REQUIRED");
  }
  if (response.status === 404) {
    throw new OneDriveSyncError("OneDrive फ़ाइल या फ़ोल्डर नहीं मिला।", "NOT_FOUND");
  }
  if (response.status === 409) {
    throw new OneDriveSyncError("OneDrive में समान नाम की फ़ाइल मौजूद है।", "CONFLICT");
  }
  if (!response.ok) {
    let message = `Microsoft Graph अनुरोध असफल हुआ (${response.status})।`;
    try {
      const details = await response.json();
      message = details.error?.message || message;
    } catch {
      // Keep the HTTP status when Graph doesn't return a JSON error.
    }
    throw new OneDriveSyncError(message, "GRAPH_ERROR");
  }
  if (response.status === 204) return null;
  try {
    if (responseType === "arrayBuffer") return await response.arrayBuffer();
    if (responseType === "text") return await response.text();
    return await response.json();
  } catch (error) {
    throw new OneDriveSyncError(`OneDrive उत्तर पढ़ा नहीं जा सका: ${error.message}`, "INVALID_RESPONSE");
  }
}

async function ensureGraphFolderPath(path) {
  const segments = path.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    const currentPath = segments.slice(0, index + 1).join("/");
    try {
      await graphRequest(graphItemPath(currentPath));
    } catch (error) {
      if (!(error instanceof OneDriveSyncError) || error.code !== "NOT_FOUND") throw error;
      const parentPath = segments.slice(0, index).join("/");
      const childrenPath = parentPath
        ? `${graphItemPath(parentPath)}:/children`
        : "/me/drive/root/children";
      try {
        await graphRequest(childrenPath, {
          method: "POST",
          body: JSON.stringify({
            name: segments[index],
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail"
          })
        });
      } catch (createError) {
        if (!(createError instanceof OneDriveSyncError) || createError.code !== "CONFLICT") {
          throw createError;
        }
      }
    }
  }
}

function encodeBase64(data) {
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : null;
  if (!bytes) throw new OneDriveSyncError("मास्टर Excel का डेटा अमान्य है।", "INVALID_FILE");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function serializeOneDriveVault(vault = {}) {
  const trainingNominations = vault.trainingNominations
    || vault.allSheets?.Training_Nominations
    || [];
  const serialized = { ...vault, trainingNominations };
  if (!vault.originalWorkbook?.buffer) return serialized;
  const { buffer, ...metadata } = vault.originalWorkbook;
  return {
    ...serialized,
    originalWorkbook: { ...metadata, bufferBase64: encodeBase64(buffer) }
  };
}

export function deserializeOneDriveVault(vault = {}) {
  const allSheets = {
    ...(vault.allSheets || {}),
    ...(vault.trainingNominations && !vault.allSheets?.Training_Nominations
      ? { Training_Nominations: vault.trainingNominations }
      : {})
  };
  if (!vault.originalWorkbook?.bufferBase64) return { ...vault, allSheets };
  const binary = atob(vault.originalWorkbook.bufferBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const metadata = Object.fromEntries(
    Object.entries(vault.originalWorkbook).filter(([key]) => key !== "bufferBase64")
  );
  return { ...vault, allSheets, originalWorkbook: { ...metadata, buffer: bytes.buffer } };
}

export async function fetchOneDriveDistrictData(district) {
  const path = getDistrictDatabasePath(district);
  let contents;
  try {
    contents = await graphRequest(`${graphItemPath(path)}:/content`, { responseType: "text" });
  } catch (error) {
    if (error instanceof OneDriveSyncError && error.code === "NOT_FOUND") return null;
    throw error;
  }
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new OneDriveSyncError(`OneDrive जिला डेटाबेस JSON अमान्य है: ${error.message}`, "INVALID_DATABASE");
  }
}

export async function saveOneDriveDistrictData(district, payload) {
  const normalizedDistrict = normalizeDistrict(district);
  const path = getDistrictDatabasePath(normalizedDistrict);
  await ensureGraphFolderPath(PORTAL_FOLDER);
  const updatedAt = payload?.updatedAt || new Date().toISOString();
  const database = {
    district: normalizedDistrict,
    updatedAt,
    payload: serializeOneDriveVault({ ...payload, updatedAt })
  };
  const result = await graphRequest(`${graphItemPath(path)}:/content`, {
    method: "PUT",
    rawBody: true,
    body: JSON.stringify(database)
  });
  return {
    updatedAt,
    id: result?.id
  };
}

export async function listOneDriveStorageFiles(district) {
  const folderPath = getDistrictStoragePath(district);
  await ensureGraphFolderPath(folderPath);
  const files = [];
  let nextUrl = `${GRAPH_API}${graphItemPath(folderPath)}:/children?$select=id,name,size,file,lastModifiedDateTime`;
  while (nextUrl) {
    const result = await graphRequest(nextUrl);
    files.push(...(result.value || []).filter((item) => item.file && STORAGE_EXTENSIONS.test(item.name || "")));
    nextUrl = result["@odata.nextLink"] || "";
  }
  return files.map((item) => ({
    id: item.id,
    name: item.name,
    size: item.size,
    mime: item.file?.mimeType || "application/octet-stream",
    updatedAt: item.lastModifiedDateTime
  }));
}

export function downloadOneDriveStorageFile(district, fileId) {
  normalizeDistrict(district);
  return graphRequest(`/me/drive/items/${encodeURIComponent(fileId)}/content`, {
    responseType: "arrayBuffer"
  });
}

function sanitizeFileName(name) {
  return Array.from(String(name || "file"), (character) => {
    const code = character.charCodeAt(0);
    return /[\\/:*?"<>|]/.test(character) || code <= 0x1f || (code >= 0x7f && code <= 0x9f)
      ? "_"
      : character;
  }).join("");
}

export function getDatedOneDriveStorageFileName(item) {
  if (item.oneDriveFileName) return item.oneDriveFileName;
  const parsedDate = Date.parse(item.updatedAt || "");
  const date = new Date(parsedDate || Date.now()).toISOString().slice(0, 10);
  return `${date}_${sanitizeFileName(item.name)}`;
}

export async function uploadOneDriveStorageFile(district, item) {
  const folderPath = getDistrictStoragePath(district);
  await ensureGraphFolderPath(folderPath);
  const fileName = getDatedOneDriveStorageFileName(item);
  const content = item.data instanceof Blob
    ? await item.data.arrayBuffer()
    : item.data;
  if (!(content instanceof ArrayBuffer) && !ArrayBuffer.isView(content)) {
    throw new OneDriveSyncError("Storage फ़ाइल का डेटा अमान्य है।", "INVALID_FILE");
  }
  const result = await graphRequest(
    `${graphItemPath(`${folderPath}/${fileName}`)}:/content`,
    { method: "PUT", rawBody: true, body: content }
  );
  return {
    id: result?.id,
    name: fileName,
    updatedAt: result?.lastModifiedDateTime || new Date().toISOString()
  };
}

export async function synchronizeOneDriveVault(district, localVault) {
  const remote = await fetchOneDriveDistrictData(district);
  const remoteVault = remote?.payload ? deserializeOneDriveVault(remote.payload) : null;
  const localTime = Date.parse(localVault?.updatedAt || "") || 0;
  const remoteTime = Date.parse(remote?.updatedAt || remoteVault?.updatedAt || "") || 0;

  if (remoteVault && (!localVault || remoteTime > localTime)) {
    return { direction: "pull", vault: remoteVault, updatedAt: remote.updatedAt || remoteVault.updatedAt };
  }
  if (!localVault && !remoteVault) {
    const initialVault = {
      records: [],
      allSheets: { Training_Nominations: [] },
      sanctioned: {},
      unitRankSanc: {},
      trainingNominations: [],
      updatedAt: new Date().toISOString()
    };
    const saved = await saveOneDriveDistrictData(district, initialVault);
    const vault = { ...initialVault, updatedAt: saved.updatedAt };
    return { direction: "push", vault, updatedAt: saved.updatedAt };
  }
  if (!remoteVault || localTime > remoteTime) {
    const saved = await saveOneDriveDistrictData(district, localVault);
    const vault = { ...localVault, updatedAt: saved.updatedAt };
    return { direction: "push", vault, updatedAt: saved.updatedAt };
  }
  return { direction: "current", vault: localVault, updatedAt: localVault.updatedAt };
}

function toLocalStorageItem(remoteFile, data, district) {
  return {
    id: `odfile_${remoteFile.id}`,
    oneDriveFileId: remoteFile.id,
    oneDriveFileName: remoteFile.name,
    oneDriveUpdatedAt: remoteFile.updatedAt,
    parentId: "ROOT",
    kind: "FILE",
    name: remoteFile.name,
    mime: remoteFile.mime,
    sizeKB: (remoteFile.size / 1024).toFixed(1),
    district,
    updatedAt: remoteFile.updatedAt || new Date().toISOString(),
    data
  };
}

export async function synchronizeOneDriveStorage(district, localStorageItems = []) {
  const normalizedDistrict = normalizeDistrict(district);
  const remoteFiles = await listOneDriveStorageFiles(normalizedDistrict);
  const syncedItems = [...localStorageItems];

  for (const remoteFile of remoteFiles) {
    const matchIndex = syncedItems.findIndex((item) =>
      item.kind === "FILE" && (
        item.oneDriveFileId === remoteFile.id
        || item.oneDriveFileName === remoteFile.name
      )
    );
    if (matchIndex < 0) {
      const data = await downloadOneDriveStorageFile(normalizedDistrict, remoteFile.id);
      syncedItems.push(toLocalStorageItem(remoteFile, data, normalizedDistrict));
      continue;
    }

    const localItem = syncedItems[matchIndex];
    const remoteTime = Date.parse(remoteFile.updatedAt || "") || 0;
    const syncedTime = Date.parse(localItem.oneDriveUpdatedAt || "") || 0;
    if (remoteTime > syncedTime) {
      const data = await downloadOneDriveStorageFile(normalizedDistrict, remoteFile.id);
      syncedItems[matchIndex] = {
        ...localItem,
        ...toLocalStorageItem(remoteFile, data, localItem.district),
        id: localItem.id,
        name: localItem.name,
        parentId: localItem.parentId
      };
    }
  }

  for (let index = 0; index < syncedItems.length; index += 1) {
    const item = syncedItems[index];
    if (item.kind !== "FILE" || !STORAGE_EXTENSIONS.test(item.name || "")) continue;
    const fileName = getDatedOneDriveStorageFileName(item);
    const remoteFile = remoteFiles.find((file) => file.name === fileName);
    const localTime = Date.parse(item.updatedAt || "") || 0;
    const syncedTime = Date.parse(item.oneDriveUpdatedAt || "") || 0;
    if (remoteFile && localTime <= syncedTime) {
      if (!item.oneDriveFileId || !item.oneDriveFileName) {
        syncedItems[index] = {
          ...item,
          oneDriveFileId: remoteFile.id,
          oneDriveFileName: remoteFile.name,
          oneDriveUpdatedAt: remoteFile.updatedAt
        };
      }
      continue;
    }

    const uploaded = await uploadOneDriveStorageFile(normalizedDistrict, {
      ...item,
      oneDriveFileName: fileName
    });
    syncedItems[index] = {
      ...item,
      oneDriveFileId: uploaded.id,
      oneDriveFileName: uploaded.name,
      oneDriveUpdatedAt: uploaded.updatedAt
    };
  }

  return syncedItems;
}
