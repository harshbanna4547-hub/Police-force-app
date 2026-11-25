// src/utils/vaultStorage.js
import * as XLSX from "xlsx";

const DB_NAME = "RajasthanPoliceVaultDB";
const STORE_NAME = "district_vaults";
const DRIVE_DB_NAME = "PoliceOneDriveVaultDB";
const DRIVE_STORE_NAME = "drive_items";

function getDistrictVaultKeys(districtName) {
  const district = String(districtName || "").trim();
  const normalized = district
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!normalized) throw new Error("जिला पहचान खाली नहीं हो सकती।");
  return {
    current: `police_data_${normalized}`,
    legacy: district.toLowerCase()
  };
}

export function getDistrictStorageBackupFolderId(districtName) {
  const { current } = getDistrictVaultKeys(districtName);
  return `storage_backup_${current.replace(/^police_data_/, "")}`;
}

function openVaultDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function openDriveVaultDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DRIVE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRIVE_STORE_NAME)) {
        db.createObjectStore(DRIVE_STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDistrictStorageItems(districtName) {
  const db = await openDriveVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE_NAME, "readonly");
    const req = tx.objectStore(DRIVE_STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result || []).filter((item) => item.district === districtName));
    req.onerror = () => reject(req.error);
  });
}

export async function saveDistrictOfflineBackup(districtName, payload, timestamp = new Date()) {
  const { current } = getDistrictVaultKeys(districtName);
  const district = current.replace(/^police_data_/, "");
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${pad(timestamp.getDate())}-${pad(timestamp.getMonth() + 1)}-${timestamp.getFullYear()}_${pad(timestamp.getHours())}-${pad(timestamp.getMinutes())}`;
  const fileName = `Backup_${district}_${stamp}.json`;
  const folderId = getDistrictStorageBackupFolderId(districtName);
  const updatedAt = timestamp.toISOString();
  const data = new TextEncoder().encode(JSON.stringify(payload)).buffer;
  const db = await openDriveVaultDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE_NAME, "readwrite");
    const store = tx.objectStore(DRIVE_STORE_NAME);
    store.put({
      id: folderId,
      parentId: "ROOT",
      kind: "FOLDER",
      name: "Backup",
      district: districtName,
      updatedAt
    });
    store.put({
      id: `offline_backup_${district}_${stamp}`,
      parentId: folderId,
      kind: "FILE",
      name: fileName,
      mime: "application/json",
      sizeKB: (data.byteLength / 1024).toFixed(1),
      district: districtName,
      updatedAt,
      data
    });
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("police-vault-updated"));
      resolve(fileName);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceDistrictStorageItems(districtName, items) {
  const db = await openDriveVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRIVE_STORE_NAME, "readwrite");
    const store = tx.objectStore(DRIVE_STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      (req.result || [])
        .filter((item) => item.district === districtName)
        .forEach((item) => store.delete(item.id));
      (Array.isArray(items) ? items : []).forEach((item) => {
        store.put({ ...item, district: districtName });
      });
    };
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// किसी जिले का स्थायी डेटा सेव (Overwrite) करना
export async function saveDistrictVault(districtName, payload) {
  const { current } = getDistrictVaultKeys(districtName);
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      ...payload,
      updatedAt: payload.updatedAt || new Date().toISOString()
    }, current);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// किसी जिले का सेव डेटा पढ़ना
export async function loadDistrictVault(districtName) {
  const { current, legacy } = getDistrictVaultKeys(districtName);
  const db = await openVaultDB();
  const readKey = (key) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  const currentVault = await readKey(current);
  if (currentVault) return currentVault;

  const legacyVault = await readKey(legacy);
  if (!legacyVault) return null;
  await saveDistrictVault(districtName, legacyVault);
  return legacyVault;
}

// किसी जिले का डेटा पूरी तरह Remove / Reset करना
export async function removeDistrictVault(districtName) {
  const { current, legacy } = getDistrictVaultKeys(districtName);
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(current);
    tx.objectStore(STORE_NAME).delete(legacy);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ऐप के सभी बदलावों को वापस असली Excel (.xlsx) फ़ाइल में सेव करना
export async function writeBackToExcelFile(fileHandle, vaultData) {
  const wb = XLSX.utils.book_new();
  const sheetsToWrite = {
    ...(vaultData.allSheets || {}),
    Master_All_Data: vaultData.records || [],
    Attachment: vaultData.attRecords || [],
    Deputation: vaultData.depRecords || [],
    PL_Leave_Account: vaultData.plLeaveRows || []
  };

  Object.entries(sheetsToWrite).forEach(([sheetName, rows]) => {
    const ws = XLSX.utils.json_to_sheet(Array.isArray(rows) ? rows : []);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  });

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  // यदि यूज़र ने Direct File Handle से फाइल खोली है तो सीधे उसी Excel फाइल में लिखें
  if (fileHandle && fileHandle.createWritable) {
    const writable = await fileHandle.createWritable();
    await writable.write(wbOut);
    await writable.close();
    return "DIRECT_SAVED";
  }

  // अन्यथा अपडेटेड Master Excel डाउनलोड करें
  XLSX.writeFile(wb, vaultData.fileName || "Updated_MASTER_VAULT.xlsx");
  return "DOWNLOADED";
}
