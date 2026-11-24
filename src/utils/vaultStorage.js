// src/utils/vaultStorage.js
import * as XLSX from "xlsx";

const DB_NAME = "RajasthanPoliceVaultDB";
const STORE_NAME = "district_vaults";

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

// किसी जिले का स्थायी डेटा सेव (Overwrite) करना
export async function saveDistrictVault(districtName, payload) {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(payload, districtName.toLowerCase().trim());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// किसी जिले का सेव डेटा पढ़ना
export async function loadDistrictVault(districtName) {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(districtName.toLowerCase().trim());
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// किसी जिले का डेटा पूरी तरह Remove / Reset करना
export async function removeDistrictVault(districtName) {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(districtName.toLowerCase().trim());
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
