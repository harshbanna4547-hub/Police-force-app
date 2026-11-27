import { getOfficeServerConfig } from "./lanSyncClient.js";
import { getDistrictStorageBackupFolderId } from "../utils/vaultStorage.js";

const SYNC_API = "/api/onedrive-sync";
const PORTAL_FOLDER = "PoliceForcePortal";
const DEVICE_ID_KEY = "police_portal_device_id";
const DEVICE_NAME_KEY = "police_portal_device_name";
const STORAGE_EXTENSIONS = /\.(xlsx?|xlsm|xlsb|xltx?|xltm|csv|pdf)$/i;
let memoryDeviceId = "";

function isDistrictBackupFile(fileName, district) {
  return new RegExp(`^Backup_${normalizeDistrict(district)}_\\d{2}-\\d{2}-\\d{4}_\\d{2}-\\d{2}\\.json$`, "i")
    .test(String(fileName || ""));
}

export class OneDriveSyncError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "OneDriveSyncError";
    this.code = code;
  }
}

function normalizeDistrict(district) {
  const normalized = String(district || "").trim().toUpperCase();
  if (!/^[A-Z0-9_]{1,60}$/.test(normalized)) {
    throw new OneDriveSyncError("जिला पहचान अमान्य है।", "DISTRICT_INVALID");
  }
  return normalized;
}

export function getDistrictDatabasePath(district) {
  return `${PORTAL_FOLDER}/${normalizeDistrict(district)}_master_db.json`;
}

export function getDistrictStoragePath(district) {
  return `${PORTAL_FOLDER}/${normalizeDistrict(district)}/Storage`;
}

async function requestSyncApi(resource, district, {
  method = "GET",
  body,
  contentType,
  fileName,
  fileType,
  storageFolder,
  fileId,
  responseType = "json"
} = {}) {
  const { token } = getOfficeServerConfig();
  const query = new URLSearchParams({ resource, district: normalizeDistrict(district) });
  if (fileId) query.set("fileId", fileId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let response;
  try {
    response = await fetch(`${SYNC_API}?${query}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(fileName ? { "X-File-Name": encodeURIComponent(fileName) } : {}),
        ...(fileType ? { "X-File-Type": fileType } : {}),
        ...(storageFolder ? { "X-Storage-Folder": storageFolder } : {})
      },
      ...(body !== undefined ? { body } : {}),
      signal: controller.signal
    });
  } catch (error) {
    const message = error.name === "AbortError" ? "Sync API request timed out." : error.message;
    throw new OneDriveSyncError(`OneDrive sync API is unavailable: ${message}`, "OFFLINE");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let details = {};
    try { details = await response.json(); } catch { /* Use the HTTP status below. */ }
    const message = details.error || `OneDrive sync API request failed (${response.status}).`;
    const code = response.status === 401 || response.status === 403
      ? "AUTH_REQUIRED"
      : response.status === 404
        ? "NOT_FOUND"
        : response.status === 409
          ? "CONFLICT"
          : response.status === 413
            ? "FILE_TOO_LARGE"
            : "API_ERROR";
    throw new OneDriveSyncError(message, code);
  }
  if (response.status === 204) return null;
  try {
    if (responseType === "arrayBuffer") return await response.arrayBuffer();
    if (responseType === "text") return await response.text();
    return await response.json();
  } catch (error) {
    throw new OneDriveSyncError(`OneDrive sync API response could not be read: ${error.message}`, "INVALID_RESPONSE");
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
  const result = await requestSyncApi("database", district);
  return result.database;
}

export async function saveOneDriveDistrictData(district, payload) {
  const normalizedDistrict = normalizeDistrict(district);
  const updatedAt = payload?.updatedAt || new Date().toISOString();
  const result = await requestSyncApi("database", normalizedDistrict, {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ payload: serializeOneDriveVault({ ...payload, updatedAt }) })
  });
  return {
    updatedAt: result.updatedAt || updatedAt,
    id: result.id
  };
}

export async function listOneDriveStorageFiles(district) {
  const result = await requestSyncApi("storage", district);
  return result.files;
}

export function downloadOneDriveStorageFile(district, fileId) {
  return requestSyncApi("storage-file", district, { fileId, responseType: "arrayBuffer" });
}

function getPersistentDeviceId() {
  try {
    const storedId = window.localStorage.getItem(DEVICE_ID_KEY);
    if (storedId) return storedId;
    memoryDeviceId = memoryDeviceId || `device_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    window.localStorage.setItem(DEVICE_ID_KEY, memoryDeviceId);
    return memoryDeviceId;
  } catch (error) {
    console.warn("Device ID could not be persisted in local storage:", error);
    memoryDeviceId = memoryDeviceId || `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return memoryDeviceId;
  }
}

function getBrowserName(userAgent) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Chrome|CriOS/i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "Unknown";
}

function getOperatingSystem(userAgent) {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

export function getCurrentOneDriveDevice(lastDataUpdatedAt = null) {
  const userAgent = navigator.userAgent || "";
  const screenWidth = window.innerWidth || 0;
  const screenType = screenWidth <= 768
    ? "Mobile"
    : screenWidth <= 1024
      ? "Tablet"
      : "Desktop";
  let name = "";
  try {
    name = window.localStorage.getItem(DEVICE_NAME_KEY) || "";
  } catch (error) {
    console.warn("Device name could not be read from local storage:", error);
  }
  const os = getOperatingSystem(userAgent);
  const browser = getBrowserName(userAgent);
  return {
    deviceId: getPersistentDeviceId(),
    name: name || `Personal ${screenType === "Mobile" ? "Mobile" : "PC"}`,
    os,
    browser,
    screenType,
    lastActiveAt: new Date().toISOString(),
    lastDataUpdatedAt
  };
}

export function saveCurrentOneDriveDeviceName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 80) {
    throw new OneDriveSyncError("डिवाइस का नाम 1 से 80 अक्षरों के बीच होना चाहिए।", "DEVICE_NAME_INVALID");
  }
  window.localStorage.setItem(DEVICE_NAME_KEY, name);
  return name;
}

export function fetchOneDriveConfigurationStatus(district) {
  return requestSyncApi("config-status", district);
}

export async function fetchOneDriveActiveDevices(district) {
  const result = await requestSyncApi("active-devices", district);
  return result.devices;
}

export async function registerOneDriveActiveDevice(district, device) {
  const result = await requestSyncApi("active-devices", district, {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ device })
  });
  return result.devices;
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
  const isBackupFolder = item.oneDriveFolder === "Backup"
    || (item.district && item.parentId === getDistrictStorageBackupFolderId(item.district));
  if (isBackupFolder) {
    return item.name;
  }
  const parsedDate = Date.parse(item.updatedAt || "");
  const date = new Date(parsedDate || Date.now()).toISOString().slice(0, 10);
  return `${date}_${sanitizeFileName(item.name)}`;
}

export async function uploadOneDriveStorageFile(district, item) {
  const fileName = getDatedOneDriveStorageFileName(item);
  const content = item.data instanceof Blob
    ? await item.data.arrayBuffer()
    : item.data;
  if (!(content instanceof ArrayBuffer) && !ArrayBuffer.isView(content)) {
    throw new OneDriveSyncError("Storage फ़ाइल का डेटा अमान्य है।", "INVALID_FILE");
  }
  const result = await requestSyncApi("storage", district, {
    method: "POST",
    body: content,
    contentType: item.mime || "application/octet-stream",
    fileName,
    fileType: item.mime || "application/octet-stream",
    storageFolder: item.oneDriveFolder
      || (item.parentId === getDistrictStorageBackupFolderId(district) ? "Backup" : "")
  });
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

  const localRecordsCount = Array.isArray(localVault?.records) ? localVault.records.length : 0;
  const remoteRecordsCount = Array.isArray(remoteVault?.records) ? remoteVault.records.length : 0;

  if (remoteVault && (!localVault || remoteTime > localTime || (localRecordsCount === 0 && remoteRecordsCount > 0))) {
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
    oneDriveFolder: remoteFile.folder || "",
    parentId: remoteFile.folder === "Backup"
      ? getDistrictStorageBackupFolderId(district)
      : "ROOT",
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
        || (
          item.oneDriveFileName === remoteFile.name
          && (item.oneDriveFolder || "") === (remoteFile.folder || "")
        )
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
    const isBackup = item.parentId === getDistrictStorageBackupFolderId(normalizedDistrict)
      && isDistrictBackupFile(item.name, normalizedDistrict);
    if (item.kind !== "FILE" || (!isBackup && !STORAGE_EXTENSIONS.test(item.name || ""))) continue;
    const fileName = getDatedOneDriveStorageFileName(item);
    const remoteFile = remoteFiles.find((file) =>
      file.name === fileName
      && (file.folder || "") === (isBackup ? "Backup" : "")
    );
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
      oneDriveFileName: fileName,
      oneDriveFolder: isBackup ? "Backup" : ""
    });
    syncedItems[index] = {
      ...item,
      oneDriveFileId: uploaded.id,
      oneDriveFileName: uploaded.name,
      oneDriveFolder: isBackup ? "Backup" : "",
      oneDriveUpdatedAt: uploaded.updatedAt
    };
  }

  return syncedItems;
}
