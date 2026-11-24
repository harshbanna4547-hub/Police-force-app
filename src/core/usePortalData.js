import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DEFAULT_SANCTIONED } from "../data/cadreConfig";
import { generateAllReportsData, downloadAllReportsExcel } from "../utils/reportEngine";
import { exportMasterFile } from "./masterExportHelper";
import {
  getDistrictStorageItems,
  loadDistrictVault,
  removeDistrictVault,
  replaceDistrictStorageItems,
  saveDistrictVault,
  writeBackToExcelFile
} from "../utils/vaultStorage";
import {
  fetchDistrictCloudData,
  isCloudConfigured,
  saveDistrictCloudData
} from "./districtAuth";
import {
  OfficeServerError,
  synchronizeOfficeVault
} from "./lanSyncClient.js";

const OFFICE_DISTRICT_ID = "CHITTORGARH";
const LAN_SYNC_INTERVAL_MS = 15000;

function readDistrictSetting(key, districtId, fallback) {
  try {
    const scopedKey = `${key}_${districtId}`;
    const scopedValue = localStorage.getItem(scopedKey);
    if (scopedValue) return JSON.parse(scopedValue);
    if (districtId === "CHITTORGARH") {
      const legacyValue = localStorage.getItem(key);
      if (legacyValue) {
        localStorage.setItem(scopedKey, legacyValue);
        return JSON.parse(legacyValue);
      }
    }
  } catch (error) {
    console.error(`District setting "${key}" could not be read:`, error);
  }
  return fallback;
}

function readLegacyDistrictBackup(districtId, districtName) {
  if (districtId !== "CHITTORGARH") return null;
  try {
    const saved = localStorage.getItem("police_portal_saved_data");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return parsed.district === districtName && Array.isArray(parsed.records) ? parsed : null;
  } catch (error) {
    console.error("Legacy district backup could not be read:", error);
    return null;
  }
}

function ensureEmployeeUids(rows) {
  const used = new Set(rows.map((employee) => employee?._uid).filter(Boolean));
  return rows.map((employee, index) => {
    if (employee?._uid) return employee;
    let uid;
    do {
      uid = `emp_${index}_${Math.random().toString(36).slice(2, 7)}`;
    } while (used.has(uid));
    used.add(uid);
    return { ...employee, _uid: uid };
  });
}

function hydrateEmployeeData(sheets, sourceRecords, mainSheetName = "Master_All_Data") {
  const records = ensureEmployeeUids(sourceRecords || []);
  const allSheets = Object.fromEntries(
    Object.entries(sheets || {}).map(([sheetName, rows]) => [
      sheetName,
      sheetName === mainSheetName
        ? records
        : (Array.isArray(rows) ? ensureEmployeeUids(rows) : rows)
    ])
  );
  allSheets[mainSheetName] = records;
  allSheets["Master_All_Data"] = records;
  return { records, allSheets };
}

function encodeArrayBuffer(buffer) {
  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function decodeArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function serializeVaultForOffice(vault) {
  if (!vault?.originalWorkbook?.buffer) return vault;
  const { buffer, ...metadata } = vault.originalWorkbook;
  return {
    ...vault,
    originalWorkbook: {
      ...metadata,
      bufferBase64: encodeArrayBuffer(buffer)
    }
  };
}

function deserializeVaultFromOffice(vault) {
  if (!vault?.originalWorkbook?.bufferBase64) return vault;
  const { bufferBase64, ...metadata } = vault.originalWorkbook;
  return {
    ...vault,
    originalWorkbook: {
      ...metadata,
      buffer: decodeArrayBuffer(bufferBase64)
    }
  };
}

function createUniqueEmployeeUid(rows) {
  let uid;
  do {
    uid = `emp_${rows.length}_${Math.random().toString(36).slice(2, 7)}`;
  } while (rows.some((row) => row._uid === uid));
  return uid;
}

function readWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellStyles: true });
  const sheets = {};
  workbook.SheetNames.forEach((name) => {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" });
  });
  return { workbook, sheets };
}

function captureWorkbookMetadata(workbook, allSheets, mainSheetName) {
  const sheets = {};
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const range = worksheet?.["!ref"]
      ? XLSX.utils.decode_range(worksheet["!ref"])
      : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const headerRow = range.s.r;
    const headerColumns = [];
    const technicalColumns = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c: column })];
      const key = String(cell?.v ?? "").trim();
      if (key === "_uid" || /^__EMPTY(?:_|$)/i.test(key)) {
        technicalColumns.push(column);
      } else if (!key) {
        technicalColumns.push(column);
      } else {
        headerColumns.push({ key, column });
      }
    }

    const nameColumn = headerColumns.find(({ key }) => key.toUpperCase() === "NAME")?.column;
    const dataRowIndexes = [];
    for (let row = headerRow + 1; row <= range.e.r; row += 1) {
      const hasData = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + index })];
        return cell?.v !== undefined && cell.v !== null && cell.v !== "";
      }).some(Boolean);
      if (!hasData) continue;
      if (sheetName === mainSheetName && nameColumn !== undefined) {
        const name = worksheet[XLSX.utils.encode_cell({ r: row, c: nameColumn })]?.v;
        if (!String(name || "").trim()) continue;
      }
      dataRowIndexes.push(row);
    }

    const sourceRows = allSheets[sheetName] || [];
    const uidToRow = {};
    sourceRows.forEach((record, index) => {
      if (record?._uid && dataRowIndexes[index] !== undefined) {
        uidToRow[record._uid] = dataRowIndexes[index];
      }
    });
    sheets[sheetName] = {
      headerRow,
      headerColumns,
      technicalColumns,
      uidToRow,
      dataRowIndexes,
      lastRow: range.e.r,
      lastColumn: worksheet["!ref"] ? range.e.c : -1,
      columnWidths: (worksheet["!cols"] || []).map((column) => column ? {
        wch: column.wch ?? column.width,
        hidden: column.hidden,
        style: column.style
      } : null),
      rowHeights: (worksheet["!rows"] || []).map((row) => row ? {
        hpt: row.hpt,
        hpx: row.hpx,
        hidden: row.hidden
      } : null)
    };
  });
  return { mainSheetName, sheets };
}

function makeOriginalWorkbook(buffer, workbook, allSheets, mainSheetName) {
  const originalBuffer = buffer instanceof ArrayBuffer
    ? buffer.slice(0)
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return {
    buffer: originalBuffer,
    ...captureWorkbookMetadata(workbook, allSheets, mainSheetName)
  };
}

export default function usePortalData({ districtId = "", districtName = "", authUserId = "" } = {}) {
  const activeProfile = districtName;
  const [allSheets, setAllSheets] = useState({});
  const [records, setRecords] = useState([]);
  const [attRecords, setAttRecords] = useState([]);
  const [depRecords, setDepRecords] = useState([]);
  const [plLeaveRows, setPlLeaveRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [originalWorkbook, setOriginalWorkbook] = useState(null);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [sanctioned, setSanctioned] = useState(DEFAULT_SANCTIONED);
  const [unitRankSanc, setUnitRankSanc] = useState({});
  const [loadedDistrictId, setLoadedDistrictId] = useState("");
  const [persistenceError, setPersistenceError] = useState("");
  const [cloudSyncStatus, setCloudSyncStatus] = useState(
    isCloudConfigured ? "क्लाउड बैकअप उपलब्ध" : "क्लाउड कॉन्फ़िगरेशन लंबित"
  );
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lanSyncStatus, setLanSyncStatus] = useState("offline");

  const fileHandleRef = useRef(null);
  const isInitialLoad = useRef(true);
  const lanSyncInProgress = useRef(false);
  const isDistrictDataReady = Boolean(districtId && loadedDistrictId === districtId);

  const applyOfficeVault = useCallback(async (officeVault) => {
    const restoredVault = deserializeVaultFromOffice(officeVault);
    const { storageVaultItems, ...savedData } = restoredVault;
    if (Array.isArray(storageVaultItems)) {
      await replaceDistrictStorageItems(activeProfile, storageVaultItems);
    }

    const sourceRecords = Array.isArray(savedData.records) ? savedData.records : [];
    const mainSheetName = savedData.allSheets?.["Master_All_Data"]
      ? "Master_All_Data"
      : Object.keys(savedData.allSheets || {})[0] || "Master_All_Data";
    const hydrated = hydrateEmployeeData(savedData.allSheets || {}, sourceRecords, mainSheetName);
    const nextSanctioned = savedData.sanctioned
      || readDistrictSetting("police_sanctioned_data", districtId, DEFAULT_SANCTIONED);
    const nextUnitRankSanc = savedData.unitRankSanc
      || readDistrictSetting("police_unit_rank_sanctioned", districtId, {});

    setAllSheets(hydrated.allSheets);
    setRecords(hydrated.records);
    setAttRecords(savedData.attRecords || []);
    setDepRecords(savedData.depRecords || []);
    setPlLeaveRows(savedData.plLeaveRows || hydrated.allSheets.PL_Leave_Account || []);
    setSanctioned(nextSanctioned);
    setUnitRankSanc(nextUnitRankSanc);
    setFileName(savedData.fileName || "");
    setOriginalWorkbook(savedData.originalWorkbook || null);
    fileHandleRef.current = null;
    setHasUnsavedChanges(false);
    await saveDistrictVault(districtId, {
      ...savedData,
      ...hydrated,
      sanctioned: nextSanctioned,
      unitRankSanc: nextUnitRankSanc
    });
  }, [activeProfile, districtId]);

  const syncLanData = useCallback(async (sourceVault, forceLocalUpdate = false) => {
    if (districtId !== OFFICE_DISTRICT_ID) return;
    if (lanSyncInProgress.current) return;
    lanSyncInProgress.current = true;
    setLanSyncStatus("checking");
    try {
      let localVault = sourceVault || await loadDistrictVault(districtId);
      if (forceLocalUpdate && localVault) {
        localVault = { ...localVault, updatedAt: new Date().toISOString() };
        await saveDistrictVault(districtId, localVault);
      }
      const storageVaultItems = await getDistrictStorageItems(activeProfile);
      const result = await synchronizeOfficeVault(
        districtId,
        serializeVaultForOffice(localVault),
        storageVaultItems
      );
      if (result.direction === "pull" && result.vault) {
        await applyOfficeVault({
          ...result.vault,
          updatedAt: result.updatedAt || result.vault.updatedAt
        });
      } else if (result.direction === "conflict") {
        setLanSyncStatus("conflict");
        return;
      } else if (result.direction === "push" && localVault && result.updatedAt) {
        await saveDistrictVault(districtId, {
          ...localVault,
          updatedAt: result.updatedAt
        });
      }
      setLanSyncStatus("connected");
    } catch (error) {
      if (error instanceof OfficeServerError && error.code === "OFFLINE") {
        setLanSyncStatus("offline");
      } else if (error instanceof OfficeServerError && ["CONFIG_MISSING", "AUTH_REQUIRED"].includes(error.code)) {
        setLanSyncStatus("key-required");
      } else if (error instanceof OfficeServerError && error.code === "CONFLICT") {
        setLanSyncStatus("conflict");
      } else {
        console.error("GR office server sync failed:", error);
        setLanSyncStatus("error");
      }
    } finally {
      lanSyncInProgress.current = false;
    }
  }, [activeProfile, applyOfficeVault, districtId]);

  useEffect(() => {
    if (!districtId) return undefined;

    let mounted = true;
    isInitialLoad.current = true;

    const loadDistrictData = async () => {
      try {
        const localVault = await loadDistrictVault(districtId);
        const localStorageItems = await getDistrictStorageItems(activeProfile);
        let vault = localVault || readLegacyDistrictBackup(districtId, activeProfile);
        let remoteWasNewer = false;

        if (authUserId && isCloudConfigured) {
          try {
            const cloudRecord = await fetchDistrictCloudData(districtId);
            if (cloudRecord?.payload) {
              const cloudTime = Date.parse(cloudRecord.updated_at || cloudRecord.payload.updatedAt || "") || 0;
              const localTime = Date.parse(vault?.updatedAt || "") || 0;
              if (!vault || cloudTime > localTime) {
                vault = { ...cloudRecord.payload, updatedAt: cloudRecord.updated_at };
                remoteWasNewer = true;
              } else {
                await saveDistrictCloudData(districtId, {
                  ...vault,
                  storageVaultItems: localStorageItems
                });
              }
            } else if (vault) {
              await saveDistrictCloudData(districtId, {
                ...vault,
                storageVaultItems: localStorageItems
              });
            }
            setCloudSyncStatus("क्लाउड डेटा सिंक हो गया");
          } catch (cloudError) {
            console.error("District data sync failed:", cloudError);
            setCloudSyncStatus(`क्लाउड सिंक असफल: ${cloudError.message}`);
          }
        }

        if (!mounted) return;
        if (remoteWasNewer && Array.isArray(vault.storageVaultItems)) {
          await replaceDistrictStorageItems(activeProfile, vault.storageVaultItems);
        }
        const savedData = { ...(vault || {}) };
        delete savedData.storageVaultItems;
        const sourceRecords = Array.isArray(savedData.records) ? savedData.records : [];
        const mainSheetName = savedData.allSheets?.["Master_All_Data"]
          ? "Master_All_Data"
          : Object.keys(savedData.allSheets || {})[0] || "Master_All_Data";
        const hydrated = hydrateEmployeeData(savedData.allSheets || {}, sourceRecords, mainSheetName);
        const nextSanctioned = savedData.sanctioned
          || readDistrictSetting("police_sanctioned_data", districtId, DEFAULT_SANCTIONED);
        const nextUnitRankSanc = savedData.unitRankSanc
          || readDistrictSetting("police_unit_rank_sanctioned", districtId, {});

        setAllSheets(hydrated.allSheets);
        setRecords(hydrated.records);
        setAttRecords(savedData.attRecords || []);
        setDepRecords(savedData.depRecords || []);
        setPlLeaveRows(savedData.plLeaveRows || hydrated.allSheets.PL_Leave_Account || []);
        setSanctioned(nextSanctioned);
        setUnitRankSanc(nextUnitRankSanc);
        setFileName(savedData.fileName || "");
        setOriginalWorkbook(savedData.originalWorkbook || null);
        fileHandleRef.current = null;
        setHasUnsavedChanges(false);
        setPersistenceError("");

        if (remoteWasNewer) {
          await saveDistrictVault(districtId, {
            ...savedData,
            ...hydrated,
            sanctioned: nextSanctioned,
            unitRankSanc: nextUnitRankSanc
          });
        }
        if (mounted) {
          isInitialLoad.current = false;
          setLoadedDistrictId(districtId);
          if (districtId === OFFICE_DISTRICT_ID) {
            void syncLanData(vault ? {
              ...savedData,
              ...hydrated,
              sanctioned: nextSanctioned,
              unitRankSanc: nextUnitRankSanc
            } : null);
          }
        }
      } catch (error) {
        console.error("District IndexedDB data could not be loaded:", error);
        if (mounted) {
          setPersistenceError(`स्थानीय जिला डेटा लोड नहीं हो सका: ${error.message}`);
          isInitialLoad.current = false;
          setLoadedDistrictId(districtId);
        }
      }
    };

    void loadDistrictData();

    return () => { mounted = false; };
  }, [districtId, activeProfile, authUserId, syncLanData]);

  const districtVaultPayload = useMemo(() => ({
      fileName,
      allSheets,
      records,
      attRecords,
      depRecords,
      plLeaveRows,
      sanctioned,
      unitRankSanc,
      originalWorkbook
    }), [fileName, allSheets, records, attRecords, depRecords, plLeaveRows, sanctioned, unitRankSanc, originalWorkbook]);

  useEffect(() => {
    if (districtId !== OFFICE_DISTRICT_ID || loadedDistrictId !== districtId) return undefined;
    const pollOfficeServer = () => {
      void syncLanData();
    };
    const syncStorageVault = () => {
      void syncLanData(undefined, true);
    };
    const interval = window.setInterval(pollOfficeServer, LAN_SYNC_INTERVAL_MS);
    window.addEventListener("police-vault-updated", syncStorageVault);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("police-vault-updated", syncStorageVault);
    };
  }, [districtId, loadedDistrictId, syncLanData]);

  useEffect(() => {
    if (isInitialLoad.current || !districtId) return undefined;
    const timeout = setTimeout(async () => {
      try {
        const localPayload = {
          ...districtVaultPayload,
          updatedAt: new Date().toISOString()
        };
        await saveDistrictVault(districtId, localPayload);
        setPersistenceError("");
        setHasUnsavedChanges(true);
        if (districtId === OFFICE_DISTRICT_ID) void syncLanData(localPayload);
        if (authUserId && isCloudConfigured) {
          setCloudSyncStatus("क्लाउड में बदलाव सेव हो रहे हैं…");
          const storageVaultItems = await getDistrictStorageItems(activeProfile);
          await saveDistrictCloudData(districtId, {
            ...localPayload,
            storageVaultItems
          });
          setCloudSyncStatus("स्थानीय और क्लाउड डेटा सिंक");
        }
      } catch (error) {
        console.error("District data could not be persisted:", error);
        setPersistenceError(`डेटा स्थायी रूप से सेव नहीं हो सका: ${error.message}`);
        if (authUserId && isCloudConfigured) setCloudSyncStatus(`क्लाउड सिंक असफल: ${error.message}`);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [districtId, activeProfile, authUserId, districtVaultPayload, syncLanData]);

  const updateEmployeeRecord = (updatedEmp, originalEmployee) => {
    const {
      _origName,
      _origFatherName,
      _origDob,
      ...employeeData
    } = updatedEmp || {};
    const originalName = _origName ?? originalEmployee?.NAME;
    const originalFatherName = _origFatherName ?? originalEmployee?.["FATHER NAME"];
    const originalDob = _origDob ?? originalEmployee?.["DATE OF BIRTH"];
    const matchesOriginal = (row) =>
      row === originalEmployee ||
      (originalName !== undefined && originalName !== "" &&
        row?.NAME === originalName &&
        row?.["FATHER NAME"] === originalFatherName &&
        row?.["DATE OF BIRTH"] === originalDob);
    const findRecordIndex = (rows) => {
      if (employeeData._uid) {
        const uidIndex = rows.findIndex((row) => row._uid && row._uid === employeeData._uid);
        if (uidIndex >= 0) return uidIndex;
      }
      return rows.findIndex(matchesOriginal);
    };

    const recordIndex = findRecordIndex(records);
    const savedEmployee = {
      ...employeeData,
      ...(recordIndex < 0 && !employeeData["S.N."] ? { "S.N.": records.length + 1 } : {}),
      _uid: employeeData._uid || records[recordIndex]?._uid || createUniqueEmployeeUid(records)
    };
    const nextRecords = recordIndex >= 0
      ? records.map((record, index) => index === recordIndex ? { ...record, ...savedEmployee } : record)
      : [...records, savedEmployee];
    const updateRows = (rows) => rows.map((row) =>
      (savedEmployee._uid && row._uid === savedEmployee._uid) || matchesOriginal(row)
        ? { ...row, ...savedEmployee, _uid: row._uid || savedEmployee._uid }
        : row
    );
    const nextSheets = Object.fromEntries(
      Object.entries(allSheets).map(([sheetName, rows]) => [
        sheetName,
        Array.isArray(rows) ? updateRows(rows) : rows
      ])
    );
    nextSheets["Master_All_Data"] = nextRecords;

    setRecords((prev) => {
      const updated = prev.map((record) =>
        record._uid === savedEmployee._uid || matchesOriginal(record)
          ? { ...record, ...savedEmployee }
          : record
      );
      return updated.some((record) => record._uid === savedEmployee._uid)
        ? updated
        : [...updated, savedEmployee];
    });
    setAllSheets((prev) => {
      const updatedSheets = Object.fromEntries(
        Object.entries(prev).map(([sheetName, rows]) => [
          sheetName,
          Array.isArray(rows) ? updateRows(rows) : rows
        ])
      );
      const currentMaster = prev["Master_All_Data"] || records;
      const updatedMaster = updateRows(currentMaster);
      updatedSheets["Master_All_Data"] = updatedMaster.some((row) => row._uid === savedEmployee._uid)
        ? updatedMaster
        : [...updatedMaster, savedEmployee];
      return updatedSheets;
    });
    return true;
  };

  const addNewEmployee = ({ employee, plEntries, trainingEntries, sajaEntries }) => {
    const { entryType, ...employeeFields } = employee;
    const savedEmployee = {
      ...employeeFields,
      "ENTRY TYPE": entryType,
      "S.N.": records.length + 1,
      _uid: createUniqueEmployeeUid(records)
    };
    const nextRecords = [...records, savedEmployee];
    const nextPLRows = [
      ...plLeaveRows,
      ...plEntries.map((entry) => ({
        "BELT NO": savedEmployee["BELT NO"],
        NAME: savedEmployee.NAME,
        LEAVE_YEAR: String(entry.fromDate || "").slice(-4) || String(new Date().getFullYear()),
        FROM_DATE: entry.fromDate,
        TO_DATE: entry.toDate,
        DAYS_TAKEN: Number(entry.days),
        ORDER_NO_DATE: entry.orderNo,
        REMARK: entry.remark
      }))
    ];
    const nextTrainingRows = [
      ...(allSheets["Training_History"] || []),
      ...trainingEntries.map((entry) => ({
        "BELT NO": savedEmployee["BELT NO"],
        NAME: savedEmployee.NAME,
        COURSE_NAME: entry.courseName,
        INSTITUTE: entry.institute,
        FROM_DATE: entry.fromDate,
        TO_DATE: entry.toDate,
        ORDER_NO_DATE: entry.orderNo
      }))
    ];
    const nextSajaRows = [
      ...(allSheets["Saja_Record"] || []),
      ...sajaEntries.map((entry) => ({
        "BELT NO": savedEmployee["BELT NO"],
        NAME: savedEmployee.NAME,
        PUNISHMENT_TYPE: entry.type,
        ORDER_NO: entry.order,
        ORDER_DATE: "",
        ORDER_NO_DATE: entry.order,
        BRIEF_REASON: entry.detail
      }))
    ];
    const nextSheets = {
      ...allSheets,
      Master_All_Data: nextRecords,
      PL_Leave_Account: nextPLRows,
      Training_History: nextTrainingRows,
      Saja_Record: nextSajaRows
    };

    setRecords(nextRecords);
    setAllSheets(nextSheets);
    setPlLeaveRows(nextPLRows);
    setHasUnsavedChanges(true);
    return true;
  };

  const removeEmployee = (employeeToRemove, reason = "Relieve / Other District Transfer", eventDate = new Date().toISOString().slice(0, 10)) => {
    const nextRecords = records.filter((employee) => employeeToRemove._uid
      ? employee._uid !== employeeToRemove._uid
      : employee !== employeeToRemove);
    if (nextRecords.length === records.length) {
      alert("चयनित कर्मचारी मुख्य सूची में नहीं मिला।");
      return false;
    }
    const dateText = String(eventDate || new Date().toISOString().slice(0, 10)).split(/[T ]/)[0];
    const nextArchive = [
      ...(Array.isArray(allSheets.Employee_Archive) ? allSheets.Employee_Archive : []),
      {
        ...employeeToRemove,
        EVENT_TYPE: reason,
        EVENT_DATE: dateText,
        YEAR: dateText.slice(0, 4)
      }
    ];
    const nextSheets = { ...allSheets, Employee_Archive: nextArchive };
    nextSheets["Master_All_Data"] = nextRecords;

    setRecords(nextRecords);
    setAllSheets(nextSheets);
    setHasUnsavedChanges(true);
    return true;
  };

  const handleDirectExcelConnect = async () => {
    try {
      let file;
      if (window.showOpenFilePicker) {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Excel Files", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx", ".xls"] } }]
        });
        fileHandleRef.current = handle;
        file = await handle.getFile();
      } else {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls";
        file = await new Promise((resolve) => {
          input.onchange = (event) => resolve(event.target.files?.at(0) || null);
          input.click();
        });
      }
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const { workbook, sheets: rawSheets } = readWorkbook(buffer);
      const mainSheetName = rawSheets["Master_All_Data"] ? "Master_All_Data" : workbook.SheetNames.at(0) || "Master_All_Data";
      const cleanMain = (rawSheets[mainSheetName] || []).filter((row) => String(row.NAME || "").trim() !== "");
      const hydrated = hydrateEmployeeData(rawSheets, cleanMain, mainSheetName);
      const sheets = hydrated.allSheets;
      const original = makeOriginalWorkbook(buffer, workbook, sheets, mainSheetName);
      const cleanAtt = (sheets.Attachment || []).filter((row) => String(row.NAME || "").trim() !== "");
      const cleanDep = (sheets.Deputation || []).filter((row) => String(row.NAME || "").trim() !== "");
      const cleanPl = sheets.PL_Leave_Account || [];

      setAllSheets(sheets);
      setRecords(hydrated.records);
      setAttRecords(cleanAtt);
      setDepRecords(cleanDep);
      setPlLeaveRows(cleanPl);
      setFileName(file.name);
      setOriginalWorkbook(original);
      await saveDistrictVault(districtId, {
        fileName: file.name,
        allSheets: sheets,
        records: hydrated.records,
        attRecords: cleanAtt,
        depRecords: cleanDep,
        plLeaveRows: cleanPl,
        sanctioned,
        unitRankSanc,
        originalWorkbook: original
      });
      setHasUnsavedChanges(false);
      alert(`✔ ${activeProfile} के लिए "${file.name}" स्थायी रूप से सेव (Overwrite) हो गई है!`);
    } catch (error) {
      if (error.name !== "AbortError") alert("फ़ाइल पढ़ने में त्रुटि: " + error.message);
    }
  };

  const handleSaveToExcel = async () => {
    try {
      const status = await writeBackToExcelFile(fileHandleRef.current, {
        fileName, allSheets, records, attRecords, depRecords, plLeaveRows
      });
      setHasUnsavedChanges(false);
      if (status === "DIRECT_SAVED") {
        alert(`✅ सभी बदलाव सीधे आपकी कंप्यूटर Excel फ़ाइल (${fileName}) में सेव हो गए हैं!`);
      } else {
        alert("📥 अपडेटेड Excel फ़ाइल डाउनलोड हो गई है! (सीधे फाइल में लिखने के लिए 'Overwrite Excel' से फाइल चुनें)");
      }
    } catch (error) {
      alert("Excel फ़ाइल में सेव करने में त्रुटि: " + error.message);
    }
  };

  const exportMaster = async () => {
    if (!records.length || isExportingMaster) return;
    setIsExportingMaster(true);
    try {
      await exportMasterFile({
        uploadedFileName: fileName,
        activeProfile,
        allSheets,
        records,
        originalWorkbook
      });
      window.dispatchEvent(new Event("police-vault-updated"));
    } catch (error) {
      console.error("Master file export failed:", error);
      alert(`मास्टर फ़ाइल एक्सपोर्ट नहीं हो सकी: ${error.message}`);
    } finally {
      setIsExportingMaster(false);
    }
  };

  const handleRemoveDistrictData = async () => {
    if (!window.confirm(`क्या आप वाकई ${activeProfile} का सारा डेटा हटाना (Remove) चाहते हैं?`)) return;
    await removeDistrictVault(districtId);
    setAllSheets({});
    setRecords([]);
    setAttRecords([]);
    setDepRecords([]);
    setPlLeaveRows([]);
    setSanctioned(DEFAULT_SANCTIONED);
    setUnitRankSanc({});
    setFileName("");
    setOriginalWorkbook(null);
    fileHandleRef.current = null;
    alert(`${activeProfile} का डेटा हटा दिया गया है।`);
  };

  const loadExcelBlob = async (buffer, name) => {
    const { workbook, sheets: rawSheets } = readWorkbook(buffer);
    const mainSheetName = rawSheets["Master_All_Data"] ? "Master_All_Data" : workbook.SheetNames.at(0) || "Master_All_Data";
    const main = (rawSheets[mainSheetName] || []).filter((row) => String(row.NAME || "").trim() !== "");
    const hydrated = hydrateEmployeeData(rawSheets, main, mainSheetName);
    const sheets = hydrated.allSheets;
    const original = makeOriginalWorkbook(buffer, workbook, sheets, mainSheetName);
    const cleanAtt = (sheets.Attachment || []).filter((row) => String(row.NAME || "").trim() !== "");
    const cleanDep = (sheets.Deputation || []).filter((row) => String(row.NAME || "").trim() !== "");
    const cleanPl = sheets.PL_Leave_Account || [];
    setAllSheets(sheets);
    setRecords(hydrated.records);
    setAttRecords(cleanAtt);
    setDepRecords(cleanDep);
    setPlLeaveRows(cleanPl);
    setFileName(name);
    setOriginalWorkbook(original);
    await saveDistrictVault(districtId, {
      fileName: name,
      allSheets: sheets,
      records: hydrated.records,
      attRecords: cleanAtt,
      depRecords: cleanDep,
      plLeaveRows: cleanPl,
      sanctioned,
      unitRankSanc,
      originalWorkbook: original
    });
    alert(`✔ "${name}" अब ${activeProfile} पोर्टल पर सक्रिय हो गई है!`);
  };

  const reports = useMemo(
    () => generateAllReportsData(records, depRecords, plLeaveRows),
    [records, depRecords, plLeaveRows]
  );
  const totalSanc = useMemo(
    () => Object.values(sanctioned).reduce((total, value) => total + Number(value || 0), 0),
    [sanctioned]
  );
  const downloadReports = () => (
    records.length ? downloadAllReportsExcel(reports) : alert("पहले Master Excel अपलोड करें!")
  );
  const persistDistrictSettings = async (payload) => {
    try {
      await saveDistrictVault(districtId, payload);
      if (authUserId && isCloudConfigured) {
        const storageVaultItems = await getDistrictStorageItems(activeProfile);
        await saveDistrictCloudData(districtId, { ...payload, storageVaultItems });
      }
      setPersistenceError("");
    } catch (error) {
      console.error("District settings could not be saved:", error);
      setPersistenceError(`जिला सेटिंग सेव नहीं हो सकी: ${error.message}`);
      throw error;
    }
  };
  const saveSanctionedSettings = (value) => persistDistrictSettings({
    ...districtVaultPayload,
    sanctioned: value
  });
  const saveUnitRankSettings = (value) => persistDistrictSettings({
    ...districtVaultPayload,
    unitRankSanc: value
  });
  const syncCloudBackup = useCallback(async () => {
    if (!districtId || !authUserId || !isCloudConfigured) {
      setCloudSyncStatus("क्लाउड सिंक के लिए मान्य लॉगिन और कॉन्फ़िगरेशन आवश्यक है।");
      return;
    }

    setIsCloudSyncing(true);
    setCloudSyncStatus("क्लाउड बैकअप चल रहा है…");
    try {
      await saveDistrictVault(districtId, districtVaultPayload);
      const storageVaultItems = await getDistrictStorageItems(activeProfile);
      await saveDistrictCloudData(districtId, {
        ...districtVaultPayload,
        storageVaultItems
      });
      setPersistenceError("");
      setCloudSyncStatus("क्लाउड बैकअप सफल");
    } catch (error) {
      console.error("Manual district cloud backup failed:", error);
      setCloudSyncStatus(`क्लाउड बैकअप असफल: ${error.message}`);
    } finally {
      setIsCloudSyncing(false);
    }
  }, [districtId, activeProfile, authUserId, districtVaultPayload]);

  useEffect(() => {
    if (!districtId || !authUserId || !isCloudConfigured) return undefined;
    let timeout;
    const scheduleCloudBackup = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => { void syncCloudBackup(); }, 600);
    };
    window.addEventListener("police-vault-updated", scheduleCloudBackup);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("police-vault-updated", scheduleCloudBackup);
    };
  }, [districtId, authUserId, syncCloudBackup]);

  return {
    activeProfile,
    isDistrictDataReady,
    allSheets,
    setAllSheets,
    records,
    setRecords,
    attRecords,
    setAttRecords,
    depRecords,
    setDepRecords,
    plLeaveRows,
    setPlLeaveRows,
    fileName,
    hasUnsavedChanges,
    editingEmployee,
    setEditingEmployee,
    isExportingMaster,
    sanctioned,
    setSanctioned,
    unitRankSanc,
    setUnitRankSanc,
    persistenceError,
    cloudSyncStatus,
    isCloudSyncing,
    lanSyncStatus: districtId === OFFICE_DISTRICT_ID ? lanSyncStatus : "disabled",
    onSaveSanctioned: saveSanctionedSettings,
    onSaveUnitRankSanc: saveUnitRankSettings,
    onCloudSync: syncCloudBackup,
    reports,
    totalSanc,
    downloadReports,
    updateEmployeeRecord,
    addNewEmployee,
    removeEmployee,
    onDirectExcelConnect: handleDirectExcelConnect,
    onSaveToExcel: handleSaveToExcel,
    onExportMasterFile: exportMaster,
    onRemoveDistrictData: handleRemoveDistrictData,
    onLoadExcelBlob: loadExcelBlob
  };
}
