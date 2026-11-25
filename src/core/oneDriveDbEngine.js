import { OFFICE_SERVER_TOKEN_KEY } from "./lanSyncClient.js";

const STORAGE_EXTENSIONS = /\.(xlsx?|xlsm|xlsb|xltx?|xltm|csv|pdf)$/i;

export class OneDriveSyncError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "OneDriveSyncError";
    this.code = code;
  }
}

function getApiBaseUrl() {
  if (typeof window === "undefined") return "";
  const { hostname, origin, port } = window.location;
  return port === "5173" || port === "4173" ? `http://${hostname}:5050` : origin;
}

function getAccessKey() {
  try {
    return String(window.localStorage.getItem(OFFICE_SERVER_TOKEN_KEY) || "").trim();
  } catch (error) {
    throw new OneDriveSyncError(`Office Access Key नहीं पढ़ी जा सकी: ${error.message}`, "CONFIG_ERROR");
  }
}

async function request(path, {
  method = "GET",
  body,
  responseType = "json",
  rawBody = false,
  headers = {}
} = {}) {
  const baseUrl = getApiBaseUrl();
  const accessKey = getAccessKey();
  if (!baseUrl || !accessKey) {
    throw new OneDriveSyncError("OneDrive sync के लिए Office Access Key कॉन्फ़िगर करें।", "CONFIG_MISSING");
  }

  let response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessKey}`,
        ...(body !== undefined ? { "Content-Type": rawBody ? "application/octet-stream" : "application/json" } : {}),
        ...headers
      },
      ...(body !== undefined ? { body: rawBody ? body : JSON.stringify(body) } : {}),
      signal: controller.signal
    });
  } catch (error) {
    throw new OneDriveSyncError(`OneDrive backend उपलब्ध नहीं है: ${error.message}`, "OFFLINE");
  } finally {
    window.clearTimeout(timeout);
  }
  if (response.status === 401 || response.status === 403) {
    throw new OneDriveSyncError("Office Access Key अस्वीकार हुई।", "AUTH_REQUIRED");
  }
  if (response.status === 409) {
    throw new OneDriveSyncError("OneDrive पर इससे नया डेटा मौजूद है।", "CONFLICT");
  }
  if (!response.ok) {
    let message = `OneDrive backend अनुरोध असफल हुआ (${response.status})।`;
    try {
      message = (await response.json()).error || message;
    } catch {
      // Retain the HTTP status when the server response is not JSON.
    }
    throw new OneDriveSyncError(message, "HTTP_ERROR");
  }
  try {
    return responseType === "arrayBuffer" ? await response.arrayBuffer() : await response.json();
  } catch (error) {
    throw new OneDriveSyncError(`OneDrive backend का उत्तर पढ़ा नहीं जा सका: ${error.message}`, "INVALID_RESPONSE");
  }
}

function encodeBase64(data) {
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : null;
  if (!bytes) throw new OneDriveSyncError("Storage फ़ाइल का डेटा अमान्य है।", "INVALID_FILE");
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function serializeVault(vault) {
  if (!vault?.originalWorkbook?.buffer) return vault;
  const { buffer, ...metadata } = vault.originalWorkbook;
  return {
    ...vault,
    originalWorkbook: { ...metadata, bufferBase64: encodeBase64(buffer) }
  };
}

function deserializeVault(vault) {
  if (!vault?.originalWorkbook?.bufferBase64) return vault;
  const binary = atob(vault.originalWorkbook.bufferBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const metadata = Object.fromEntries(
    Object.entries(vault.originalWorkbook).filter(([key]) => key !== "bufferBase64")
  );
  return { ...vault, originalWorkbook: { ...metadata, buffer: bytes.buffer } };
}

function normalizeDistrict(district) {
  const normalized = String(district || "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,60}$/.test(normalized)) {
    throw new OneDriveSyncError("जिला पहचान अमान्य है।", "DISTRICT_INVALID");
  }
  return normalized;
}

export function fetchOneDriveDistrictData(district) {
  return request(`/api/cloud-db/${encodeURIComponent(normalizeDistrict(district))}`);
}

export function saveOneDriveDistrictData(district, payload) {
  return request(`/api/cloud-db/${encodeURIComponent(normalizeDistrict(district))}`, {
    method: "POST",
    body: { payload: serializeVault(payload) }
  });
}

export function listOneDriveStorageFiles(district) {
  return request(`/api/onedrive/storage/${encodeURIComponent(normalizeDistrict(district))}`);
}

export function downloadOneDriveStorageFile(district, fileId) {
  return request(
    `/api/onedrive/storage/${encodeURIComponent(normalizeDistrict(district))}/${encodeURIComponent(fileId)}/content`,
    { responseType: "arrayBuffer" }
  );
}

export function uploadOneDriveStorageFile(district, item) {
  return request(`/api/onedrive/storage/${encodeURIComponent(normalizeDistrict(district))}`, {
    method: "POST",
    body: item.data,
    rawBody: true,
    headers: {
      "X-File-Name": encodeURIComponent(item.name),
      "X-File-Type": item.mime || "application/octet-stream"
    }
  });
}

export async function synchronizeOneDriveVault(district, localVault) {
  const remote = await fetchOneDriveDistrictData(district);
  const localTime = Date.parse(localVault?.updatedAt || "") || 0;
  const remoteTime = Date.parse(remote?.updatedAt || remote?.payload?.updatedAt || "") || 0;

  if (remote?.payload && (!localVault || remoteTime > localTime)) {
    return { direction: "pull", vault: deserializeVault(remote.payload), updatedAt: remote.updatedAt };
  }
  if (!localVault && !remote?.payload) {
    return { direction: "current", vault: null, updatedAt: null };
  }
  if (!remote?.payload || localTime > remoteTime) {
    const saved = await saveOneDriveDistrictData(district, localVault);
    return { direction: "push", vault: localVault, updatedAt: saved.updatedAt };
  }

  return { direction: "current", vault: localVault, updatedAt: localVault.updatedAt };
}

export async function synchronizeOneDriveStorage(district, localStorageItems = []) {
  const normalizedDistrict = normalizeDistrict(district);
  const { files: remoteFiles } = await listOneDriveStorageFiles(normalizedDistrict);
  const syncedItems = [...localStorageItems];
  const localFiles = syncedItems.filter((item) => item.kind === "FILE" && STORAGE_EXTENSIONS.test(item.name || ""));

  for (const remoteFile of remoteFiles) {
    const matchIndex = syncedItems.findIndex((item) =>
      item.kind === "FILE" && String(item.name || "").toLowerCase() === remoteFile.name.toLowerCase()
    );
    if (matchIndex < 0) {
      const data = await downloadOneDriveStorageFile(normalizedDistrict, remoteFile.id);
      syncedItems.push({
        id: `odfile_${remoteFile.id}`,
        oneDriveFileId: remoteFile.id,
        parentId: "ROOT",
        kind: "FILE",
        name: remoteFile.name,
        mime: remoteFile.mime,
        sizeKB: (remoteFile.size / 1024).toFixed(1),
        district: localStorageItems[0]?.district,
        updatedAt: remoteFile.updatedAt || new Date().toISOString(),
        data
      });
      continue;
    }
    const localItem = syncedItems[matchIndex];
    const localTime = Date.parse(localItem.updatedAt || "") || 0;
    const remoteTime = Date.parse(remoteFile.updatedAt || "") || 0;
    if (localTime > remoteTime) {
      const uploaded = await uploadOneDriveStorageFile(normalizedDistrict, localItem);
      syncedItems[matchIndex] = {
        ...localItem,
        oneDriveFileId: uploaded.id,
        oneDriveUpdatedAt: uploaded.updatedAt,
        updatedAt: uploaded.updatedAt || localItem.updatedAt
      };
    } else if (remoteTime > localTime || !localTime) {
      const data = await downloadOneDriveStorageFile(normalizedDistrict, remoteFile.id);
      syncedItems[matchIndex] = {
        ...localItem,
        oneDriveFileId: remoteFile.id,
        oneDriveUpdatedAt: remoteFile.updatedAt,
        mime: remoteFile.mime,
        sizeKB: (remoteFile.size / 1024).toFixed(1),
        updatedAt: remoteFile.updatedAt || localItem.updatedAt,
        data
      };
    }
  }

  for (const localItem of localFiles) {
    const existsRemotely = remoteFiles.some((file) => file.name.toLowerCase() === localItem.name.toLowerCase());
    if (existsRemotely) continue;
    const uploaded = await uploadOneDriveStorageFile(normalizedDistrict, localItem);
    const index = syncedItems.findIndex((item) => item.id === localItem.id);
    if (index >= 0) {
      syncedItems[index] = {
        ...syncedItems[index],
        oneDriveFileId: uploaded.id,
        oneDriveUpdatedAt: uploaded.updatedAt,
        updatedAt: uploaded.updatedAt || syncedItems[index].updatedAt
      };
    }
  }

  return syncedItems;
}
