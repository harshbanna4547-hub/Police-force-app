import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { DEFAULT_SANCTIONED } from "../data/cadreConfig";
import { generateAllReportsData, downloadAllReportsExcel } from "../utils/reportEngine";
import { exportMasterFile } from "./masterExportHelper";
import { saveDistrictVault, loadDistrictVault, removeDistrictVault, writeBackToExcelFile } from "../utils/vaultStorage";

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

export default function usePortalData() {
  const [activeProfile, setActiveProfile] = useState(() => localStorage.getItem("police_active_district") || "Chittorgarh");
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
  const [sanctioned, setSanctioned] = useState(() => {
    const saved = localStorage.getItem("police_sanctioned_data");
    return saved ? JSON.parse(saved) : DEFAULT_SANCTIONED;
  });

  const fileHandleRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    let mounted = true;
    isInitialLoad.current = true;
    localStorage.setItem("police_active_district", activeProfile);

    loadDistrictVault(activeProfile).then(async (vault) => {
      if (!mounted) return;
      if (vault && vault.records && vault.records.length > 0) {
        const mainSheetName = vault.allSheets?.["Master_All_Data"]
          ? "Master_All_Data"
          : Object.keys(vault.allSheets || {})[0] || "Master_All_Data";
        const hydrated = hydrateEmployeeData(vault.allSheets, vault.records, mainSheetName);
        const hydratedVault = { ...vault, ...hydrated };
        setAllSheets(hydrated.allSheets);
        setRecords(hydrated.records);
        setAttRecords(vault.attRecords || []);
        setDepRecords(vault.depRecords || []);
        setPlLeaveRows(vault.plLeaveRows || []);
        setFileName(vault.fileName || `${activeProfile}_MASTER.xlsx`);
        setOriginalWorkbook(vault.originalWorkbook || null);
        setHasUnsavedChanges(false);
        try {
          await saveDistrictVault(activeProfile, hydratedVault);
        } catch (error) {
          console.error("Could not persist employee IDs to the district vault:", error);
          alert(`कर्मचारी ID स्थायी रूप से सेव नहीं हो सकीं: ${error.message}`);
        }
      } else {
        const backup = localStorage.getItem("police_portal_saved_data");
        let savedData = null;
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            if (parsed.district === activeProfile && Array.isArray(parsed.records)) savedData = parsed;
          } catch (error) {
            console.error("Saved employee backup could not be read:", error);
          }
        }
        if (savedData) {
          const mainSheetName = savedData.allSheets?.["Master_All_Data"]
            ? "Master_All_Data"
            : Object.keys(savedData.allSheets || {})[0] || "Master_All_Data";
          const hydrated = hydrateEmployeeData(savedData.allSheets, savedData.records, mainSheetName);
          savedData = { ...savedData, ...hydrated };
          try {
            localStorage.setItem("police_portal_saved_data", JSON.stringify(savedData));
          } catch (error) {
            console.error("Could not persist employee IDs to localStorage:", error);
            alert(`कर्मचारी ID स्थानीय स्टोरेज में सेव नहीं हो सकीं: ${error.message}`);
          }
        }
        setAllSheets(savedData?.allSheets || {});
        setRecords(savedData?.records || []);
        setAttRecords(savedData?.attRecords || []);
        setDepRecords(savedData?.depRecords || []);
        setPlLeaveRows(savedData?.plLeaveRows || []);
        setFileName(savedData?.fileName || "");
        setOriginalWorkbook(savedData?.originalWorkbook || null);
        fileHandleRef.current = null;
      }
      if (!mounted) return;
      setTimeout(() => { isInitialLoad.current = false; }, 300);
    });

    return () => { mounted = false; };
  }, [activeProfile]);

  useEffect(() => {
    if (isInitialLoad.current || !fileName) return;
    saveDistrictVault(activeProfile, {
      fileName,
      allSheets,
      records,
      attRecords,
      depRecords,
      plLeaveRows,
      originalWorkbook
    });
    setHasUnsavedChanges(true);
  }, [records, attRecords, depRecords, plLeaveRows, allSheets, fileName, activeProfile, originalWorkbook]);

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
    const backup = {
      district: activeProfile,
      fileName,
      allSheets: nextSheets,
      records: nextRecords,
      attRecords,
      depRecords,
      plLeaveRows
    };

    try {
      localStorage.setItem("police_portal_saved_data", JSON.stringify(backup));
    } catch (error) {
      console.error("Employee update could not be saved to localStorage:", error);
      alert(`स्थानीय स्टोरेज में सेव नहीं हो सका: ${error.message}`);
      return false;
    }

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
    const backup = {
      district: activeProfile,
      fileName,
      allSheets: nextSheets,
      records: nextRecords,
      attRecords,
      depRecords,
      plLeaveRows: nextPLRows
    };

    try {
      localStorage.setItem("police_portal_saved_data", JSON.stringify(backup));
    } catch (error) {
      console.error("Smart employee form could not be saved to localStorage:", error);
      alert(`कर्मचारी और इतिहास सेव नहीं हो सके: ${error.message}`);
      return false;
    }

    setRecords(nextRecords);
    setAllSheets(nextSheets);
    setPlLeaveRows(nextPLRows);
    setHasUnsavedChanges(true);
    return true;
  };

  const removeEmployee = (employeeToRemove) => {
    const nextRecords = records.filter((employee) => employeeToRemove._uid
      ? employee._uid !== employeeToRemove._uid
      : employee !== employeeToRemove);
    if (nextRecords.length === records.length) {
      alert("चयनित कर्मचारी मुख्य सूची में नहीं मिला।");
      return false;
    }
    const nextSheets = Object.fromEntries(
      Object.entries(allSheets).map(([sheetName, rows]) => [
        sheetName,
        Array.isArray(rows)
          ? rows.filter((row) => employeeToRemove._uid
            ? row._uid !== employeeToRemove._uid
            : row !== employeeToRemove)
          : rows
      ])
    );
    nextSheets["Master_All_Data"] = nextRecords;
    const backup = {
      district: activeProfile,
      fileName,
      allSheets: nextSheets,
      records: nextRecords,
      attRecords,
      depRecords,
      plLeaveRows
    };

    try {
      localStorage.setItem("police_portal_saved_data", JSON.stringify(backup));
    } catch (error) {
      console.error("Could not save employee removal to localStorage:", error);
      alert(`कर्मचारी हटाने का बदलाव सेव नहीं हो सका: ${error.message}`);
      return false;
    }

    setRecords(nextRecords);
    setAllSheets(nextSheets);
    return true;
  };

  const handleDirectExcelConnect = async (targetProfile = activeProfile) => {
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
      await saveDistrictVault(targetProfile, {
        fileName: file.name,
        allSheets: sheets,
        records: hydrated.records,
        attRecords: cleanAtt,
        depRecords: cleanDep,
        plLeaveRows: cleanPl,
        originalWorkbook: original
      });
      setHasUnsavedChanges(false);
      alert(`✔ ${targetProfile} के लिए "${file.name}" स्थायी रूप से सेव (Overwrite) हो गई है!`);
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
    await removeDistrictVault(activeProfile);
    setAllSheets({});
    setRecords([]);
    setAttRecords([]);
    setDepRecords([]);
    setPlLeaveRows([]);
    setFileName("");
    setOriginalWorkbook(null);
    fileHandleRef.current = null;
    alert(`${activeProfile} का डेटा हटा दिया गया है।`);
  };

  const handleDistrictChange = async () => {
    const newDist = prompt("नया जिला लिखें (जैसे: Chittorgarh, Udaipur, Bhilwara):", activeProfile);
    if (!newDist || newDist.trim() === activeProfile) return;
    const cleanDist = newDist.trim();
    setActiveProfile(cleanDist);

    const existing = await loadDistrictVault(cleanDist);
    if (!existing || !existing.records || existing.records.length === 0) {
      setTimeout(() => {
        if (window.confirm(`${cleanDist} जिले का कोई डेटा सेव नहीं है। क्या आप अभी ${cleanDist} की Excel फ़ाइल अपलोड करना चाहते हैं?`)) {
          handleDirectExcelConnect(cleanDist);
        }
      }, 250);
    }
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
    await saveDistrictVault(activeProfile, {
      fileName: name,
      allSheets: sheets,
      records: hydrated.records,
      attRecords: cleanAtt,
      depRecords: cleanDep,
      plLeaveRows: cleanPl,
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

  return {
    activeProfile,
    setActiveProfile,
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
    onDistrictChange: handleDistrictChange,
    onLoadExcelBlob: loadExcelBlob
  };
}
