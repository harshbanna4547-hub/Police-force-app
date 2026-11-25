import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { installFontInApp, loadAllInstalledFonts, removeInstalledFont } from "../../utils/fontInstaller";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import InbuiltOfficeEditor from "../../components/shared/InbuiltOfficeEditor";
import {
  getDistrictStorageBackupFolderId,
  openDriveVaultDB,
  saveDistrictOfflineBackup
} from "../../utils/vaultStorage";
import {
  getOfficeEditorKind,
  getStorageItemSummary,
  isStrengthVaultFolder
} from "./storageLogic";
import "./storage.css";

const MODULE_DEFAULT_FOLDERS = [
  "01. Strength (स्वीकृत एवं कार्यरत नफरी)",
  "02. Transfer (स्थानांतरण एवं आदेश)",
  "03. Posting (पदस्थापन सूची)",
  "04. Bharti (नवीन भर्ती रिकॉर्ड)",
  "05. Training (प्रशिक्षण एवं कोर्स)",
  "09. Training (प्रशिक्षण पत्र एवं बेतार संदेश)",
  "06. Leave (अवकाश खाता)",
  "07. 300 PL Chart (उपार्जित अवकाश)",
  "08. Increment (वार्षिक वेतन वृद्धि)",
  "09. ACP (9-18-27 पात्रता)",
  "10. Punishment (सज़ा व विभागीय जांच)",
  "11. Promotion Exam (PCC व DPC)",
  "12. Seniority (वरिष्ठता सूची)",
  "13. Roster (मासिक थाना रोस्टर)",
  "Backup"
];

function dateOnly(value) {
  const text = String(value || "");
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  return local ? `${String(local[1]).padStart(2, "0")}-${String(local[2]).padStart(2, "0")}-${local[3]}` : text.split(/[T ]/)[0];
}

export default function StorageVaultModule({
  activeProfile,
  records,
  allSheets,
  onLoadExcelBlob,
  onRestoreBackup,
  fileName,
  hasData,
  hasUnsavedChanges,
  onSaveToExcel,
  onExportMasterFile,
  isExportingMaster,
  onRemoveDistrictData,
  language = "hi"
}) {
  const english = language === "en";
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState("ROOT");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("GRID"); // GRID | LIST

  // Inbuilt Hindi Font Installer & Office Suite States
  const [installedFonts, setInstalledFonts] = useState([]);
  const [fontChoice, setFontChoice] = useState("DevLys 010");
  const [officeItem, setOfficeItem] = useState(null);
  const loadAllItems = useCallback(async () => {
    const db = await openDriveVaultDB();
    const tx = db.transaction("drive_items", "readonly");
    const req = tx.objectStore("drive_items").getAll();
    req.onsuccess = async () => {
      const existing = getStorageItemSummary(req.result, activeProfile);
      const rootFolderNames = new Set(
        existing.filter((x) => x.parentId === "ROOT" && x.kind === "FOLDER").map((x) => x.name)
      );

      const missingFolders = MODULE_DEFAULT_FOLDERS.filter((name) => !rootFolderNames.has(name));
      if (missingFolders.length > 0) {
        const writeTx = db.transaction("drive_items", "readwrite");
        const store = writeTx.objectStore("drive_items");
        missingFolders.forEach((fName, idx) => {
          store.put({
            id: fName === "Backup"
              ? getDistrictStorageBackupFolderId(activeProfile)
              : `mod_fld_${idx}_${Date.now()}`,
            parentId: "ROOT",
            kind: "FOLDER",
            name: fName,
            district: activeProfile,
            updatedAt: new Date().toISOString()
          });
        });
        writeTx.oncomplete = () => {
          window.dispatchEvent(new Event("police-vault-updated"));
          const reTx = db.transaction("drive_items", "readonly");
          const reReq = reTx.objectStore("drive_items").getAll();
          reReq.onsuccess = () => setItems(getStorageItemSummary(reReq.result, activeProfile));
        };
      } else {
        setItems(existing);
      }
    };
  }, [activeProfile]);

  useEffect(() => {
    loadAllItems();
    loadAllInstalledFonts().then(setInstalledFonts);
    const refreshItems = () => loadAllItems();
    window.addEventListener("police-vault-updated", refreshItems);
    window.addEventListener("police-vault-cloud-updated", refreshItems);
    return () => {
      window.removeEventListener("police-vault-updated", refreshItems);
      window.removeEventListener("police-vault-cloud-updated", refreshItems);
    };
  }, [loadAllItems]);

  const handleFontInstall = async (e) => {
    const file = e.target.files?.at(0);
    if (!file) return;
    await installFontInApp(fontChoice, file);
    const updated = await loadAllInstalledFonts();
    setInstalledFonts(updated);
    e.target.value = "";
    alert(`✔ "${fontChoice}" फ़ॉन्ट ऐप में स्थायी रूप से इंस्टॉल हो गया है!`);
  };

  const saveItemToDB = async (item) => {
    const db = await openDriveVaultDB();
    return new Promise((res, rej) => {
      const tx = db.transaction("drive_items", "readwrite");
      tx.objectStore("drive_items").put(item);
      tx.oncomplete = () => {
        window.dispatchEvent(new Event("police-vault-updated"));
        res(true);
      };
      tx.onerror = () => rej(tx.error);
    });
  };

  const handleCreateFolder = async () => {
    const name = prompt("नए फोल्डर का नाम लिखें (जैसे: DOB Orders 2026, Bharti Files):");
    if (!name || !name.trim()) return;
    await saveItemToDB({
      id: "fld_" + Date.now() + Math.random().toString(36).slice(2, 6),
      parentId: currentFolderId,
      kind: "FOLDER",
      name: name.trim(),
      district: activeProfile,
      updatedAt: new Date().toISOString()
    });
    await loadAllItems();
  };

  const handleUploadFiles = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    for (const file of fileList) {
      const buffer = await file.arrayBuffer();
      await saveItemToDB({
        id: "fil_" + Date.now() + Math.random().toString(36).slice(2, 6),
        parentId: currentFolderId,
        kind: "FILE",
        name: file.name,
        mime: file.type,
        sizeKB: (file.size / 1024).toFixed(1),
        district: activeProfile,
        updatedAt: new Date().toISOString(),
        data: buffer
      });
    }
    e.target.value = "";
    await loadAllItems();
    alert(`✔ ${fileList.length} फ़ाइल(ें) फोल्डर में अपलोड हो गईं!`);
  };

  const handleMasterExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      await onLoadExcelBlob(buffer, file.name, { saveToStorage: true });
      await loadAllItems();
    } catch (error) {
      console.error("Master Excel upload failed:", error);
      alert(`Master Excel अपलोड नहीं हो सकी: ${error.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      await onRestoreBackup(backup);
      await saveDistrictOfflineBackup(activeProfile, backup);
      await loadAllItems();
      alert(`✔ "${file.name}" Backup सफलतापूर्वक Restore और Backup फ़ोल्डर में सेव हो गया।`);
    } catch (error) {
      console.error("District backup restore failed:", error);
      alert(`Backup Restore नहीं हो सका: ${error.message}`);
    } finally {
      e.target.value = "";
    }
  };
  const handleCreateNewDoc = async (docType) => {
    const rawName = prompt(docType === "EXCEL" ? "नई Excel फ़ाइल का नाम लिखें:" : "नई Word फ़ाइल का नाम लिखें:");
    if (!rawName || !rawName.trim()) return;

    let createdItem;
    if (docType === "EXCEL") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([{ "क्र.सं.": 1, "पद": "", "बेल्ट नं.": "", "नाम": "", "पदस्थापन": "" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fName = rawName.endsWith(".xlsx") ? rawName : `${rawName.trim()}.xlsx`;
      createdItem = {
        id: "fil_" + Date.now(),
        parentId: currentFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeKB: (out.byteLength / 1024).toFixed(1),
        district: activeProfile,
        updatedAt: new Date().toISOString(),
        data: out
      };
    } else {
      const html = `<html><head><meta charset="utf-8"><style>body{font-family:'DevLys 010',Arial;font-size:16pt;}</style></head><body><h2 style="text-align:center;">कार्यालय पुलिस अधीक्षक ${activeProfile}</h2><p></p></body></html>`;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const buf = await blob.arrayBuffer();
      const fName = rawName.endsWith(".doc") ? rawName : `${rawName.trim()}.doc`;
      createdItem = {
        id: "fil_" + Date.now(),
        parentId: currentFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/msword",
        sizeKB: (buf.byteLength / 1024).toFixed(1),
        district: activeProfile,
        updatedAt: new Date().toISOString(),
        data: buf
      };
    }
    await saveItemToDB(createdItem);
    await loadAllItems();
    setOfficeItem(createdItem);
  };

  // [OFFICE SUITE] Save updates made in Inbuilt Excel, Word, or PDF Editor back to IndexedDB + OneDrive Sync
  const handleSaveOfficeFile = async (updatedItem) => {
    const byteLength = updatedItem?.data?.byteLength ?? updatedItem?.data?.length ?? 0;
    const nextItem = {
      ...updatedItem,
      sizeKB: byteLength ? (byteLength / 1024).toFixed(1) : updatedItem.sizeKB,
      updatedAt: new Date().toISOString()
    };
    await saveItemToDB(nextItem);
    setOfficeItem(nextItem);
    await loadAllItems();
  };

  const handleSaveLivePortalBackup = async () => {
    if (!records || records.length === 0) return alert("पोर्टल में अभी कोई डेटा लोड नहीं है!");
    const wb = XLSX.utils.book_new();
    const sheets = { ...(allSheets || {}), Master_All_Data: records };
    Object.entries(sheets).forEach(([sName, rows]) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Array.isArray(rows) ? rows : []), sName.slice(0, 31));
    });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const stamp = new Date().toISOString().slice(0, 10);
    await saveItemToDB({
      id: "fil_" + Date.now(),
      parentId: currentFolderId,
      kind: "FILE",
      name: `${activeProfile}_Live_Backup_${stamp}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeKB: (out.byteLength / 1024).toFixed(1),
      district: activeProfile,
      updatedAt: new Date().toISOString(),
      data: out
    });
    await loadAllItems();
    alert("✔ वर्तमान पोर्टल का पूरा डेटा इस फोल्डर में Excel फ़ाइल के रूप में सेव हो गया है!");
  };

  const handleRename = async (item) => {
    const newName = prompt("नया नाम लिखें:", item.name);
    if (!newName || !newName.trim() || newName.trim() === item.name) return;
    await saveItemToDB({ ...item, name: newName.trim(), updatedAt: new Date().toISOString() });
    await loadAllItems();
  };

  const handleDownload = (item) => {
    const blob = new Blob([item.data], { type: item.mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`क्या आप "${item.name}" को हमेशा के लिए हटाना चाहते हैं?`)) return;
    const db = await openDriveVaultDB();
    const toDelete = [item.id];
    const collectChildren = (pid) => {
      items.filter((x) => x.parentId === pid).forEach((child) => {
        toDelete.push(child.id);
        if (child.kind === "FOLDER") collectChildren(child.id);
      });
    };
    if (item.kind === "FOLDER") collectChildren(item.id);

    const tx = db.transaction("drive_items", "readwrite");
    const store = tx.objectStore("drive_items");
    toDelete.forEach((id) => store.delete(id));
    tx.oncomplete = () => {
      window.dispatchEvent(new Event("police-vault-updated"));
      loadAllItems();
    };
  };

  const breadcrumbs = useMemo(() => {
    const path = [];
    let curr = currentFolderId;
    while (curr && curr !== "ROOT") {
      const found = items.find((i) => i.id === curr);
      if (!found) break;
      path.unshift(found);
      curr = found.parentId;
    }
    return path;
  }, [items, currentFolderId]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? items.filter((i) => i.name.toLowerCase().includes(q))
      : items.filter((i) => i.parentId === currentFolderId);

    return [...list].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, currentFolderId, search]);

  const getFileIcon = (item) => {
    if (item.kind === "FOLDER") return "📁";
    const n = item.name.toLowerCase();
    if (/\.(xlsx?|xlsm|xlsb|xltx?|xltm|csv)$/i.test(n)) return "📊";
    if (n.endsWith(".doc") || n.endsWith(".docx")) return "📝";
    if (n.endsWith(".pdf")) return "📕";
    if (n.match(/\.(jpg|jpeg|png|webp)$/)) return "🖼️";
    return "📄";
  };
  const storageExportRows = useMemo(() => visibleItems.map((item, idx) => ({
    "S.N.": idx + 1,
    Name: item.name,
    Kind: item.kind,
    Size: item.kind === "FOLDER" ? "-" : `${item.sizeKB} KB`,
    Updated: dateOnly(item.updatedAt)
  })), [visibleItems]);

  const inStrengthFolder = useMemo(() => isStrengthVaultFolder(breadcrumbs), [breadcrumbs]);

  const openVaultItem = (item) => {
    if (item.kind === "FOLDER") {
      setCurrentFolderId(item.id);
      return;
    }
    if (getOfficeEditorKind(item.name, item.mime)) {
      setOfficeItem(item);
    }
  };

  return (
    <div className="storage-vault-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "🗄️ Storage Vault" : "🗄️ स्टोरेज वॉल्ट"}
        search={search}
        onSearchChange={setSearch}
        rows={storageExportRows}
        fileName="Storage_Vault_Index"
        language={language}
        searchPlaceholder={english ? "🔍 Search files or folders..." : "🔍 Drive में फ़ाइल/फोल्डर खोजें..."}
        extraActions={(
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "GRID" ? "LIST" : "GRID")}
            className="storage-view-toggle"
          >
            {viewMode === "GRID" ? "☰ List" : "⊞ Grid"}
          </button>
        )}
      />

      {/* [TOOLBAR] Main Storage Toolbar (केवल 4 सामान्य फ़ाइल बटन: + New Folder, Upload Files, + New Excel, + New Word) */}
      <div className="storage-action-bar">
        <div className="storage-action-group">
          <button type="button" onClick={handleCreateFolder} className="storage-btn storage-btn-navy">
            📁 + New Folder
          </button>

          <label className="storage-btn storage-btn-green">
            ⬆️ Upload Files
            <input type="file" multiple onChange={handleUploadFiles} className="storage-hidden-input" />
          </label>

          <button type="button" onClick={() => handleCreateNewDoc("EXCEL")} className="storage-btn storage-btn-emerald">
            📊 + New Excel
          </button>

          <button type="button" onClick={() => handleCreateNewDoc("WORD")} className="storage-btn storage-btn-blue">
            📝 + New Word
          </button>
        </div>
      </div>

      {/* [FONTS] Inbuilt Hindi Font Installer Banner (हिंदी फ़ॉन्ट इंस्टॉलर पट्टी) */}
      <div className="storage-font-banner">
        <div className="storage-font-controls">
          <strong className="storage-font-title">🔤 Inbuilt Hindi Font Installer:</strong>
          <select value={fontChoice} onChange={(e) => setFontChoice(e.target.value)} className="storage-font-select">
            <option value="DevLys 010">DevLys 010</option>
            <option value="Kruti Dev 010">Kruti Dev 010</option>
            <option value="Mangal">Mangal (Unicode)</option>
          </select>
          <label className="storage-font-install-btn">
            ➕ .TTF फ़ॉन्ट फ़ाइल चुनें (Install)
            <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontInstall} className="storage-hidden-input" />
          </label>
        </div>

        <div className="storage-font-chips">
          {installedFonts.map((f) => (
            <span key={f.fontName} className="storage-font-chip">
              ✔ {f.fontName}
              <button
                type="button"
                onClick={async () => {
                  await removeInstalledFont(f.fontName);
                  setInstalledFonts(await loadAllInstalledFonts());
                }}
                className="storage-font-remove-btn"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* [NAVIGATION] Breadcrumb Navigation (फ़ोल्डर पाथ नेविगेशन) */}
      <div className="storage-breadcrumbs">
        <span onClick={() => { setCurrentFolderId("ROOT"); setSearch(""); }} className="storage-crumb-link">
          🗄️ {activeProfile} Drive
        </span>
        {breadcrumbs.map((b) => (
          <React.Fragment key={b.id}>
            <span className="storage-crumb-sep">/</span>
            <span onClick={() => { setCurrentFolderId(b.id); setSearch(""); }} className="storage-crumb-link">
              {b.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* [CONTEXTUAL BAR] 01. Strength Folder ONLY Master Excel Controls */}
      {inStrengthFolder && (
        <div className="storage-strength-master-bar">
          <span className="storage-strength-master-label">
            🛡️ {english ? "01. Strength Master Data Controls" : "01. Strength मास्टर डेटा प्रबंधन"}
          </span>
          <div className="storage-action-group">
            {hasData && (
              <button type="button" onClick={onExportMasterFile} disabled={isExportingMaster} className="storage-btn storage-btn-sky">
                {isExportingMaster ? "⏳ Exporting..." : "📥 Export Master File"}
              </button>
            )}
            {fileName && hasUnsavedChanges && (
              <button type="button" onClick={onSaveToExcel} className="storage-btn storage-btn-purple">
                💾 Save Excel Changes
              </button>
            )}
            <label className="storage-btn storage-btn-sky">
              📊 Upload Master Excel File
              <input type="file" accept=".xlsx,.xls" onChange={handleMasterExcelUpload} className="storage-hidden-input" />
            </label>
            {fileName && (
              <button type="button" onClick={onRemoveDistrictData} className="storage-btn storage-btn-danger-soft">
                🗑️ Remove District Data
              </button>
            )}
            <label className="storage-btn storage-btn-purple">
              🔄 Restore Backup (.json)
              <input type="file" accept=".json,application/json" onChange={handleRestoreBackup} className="storage-hidden-input" />
            </label>
            <button type="button" onClick={handleSaveLivePortalBackup} className="storage-btn storage-btn-purple">
              💾 Save Live Data Here
            </button>
          </div>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="storage-empty-state">
          <div className="storage-empty-icon">📂</div>
          <div className="storage-empty-title">यह फोल्डर खाली है</div>
          <small>ऊपर से नया फोल्डर बनाएं या Excel, Word, PDF फ़ाइलें अपलोड करें।</small>
        </div>
      ) : viewMode === "GRID" ? (
        <div className="storage-grid">
          {visibleItems.map((item) => {
            const officeKind = item.kind === "FILE" ? getOfficeEditorKind(item.name, item.mime) : null;
            const isExcel = officeKind === "EXCEL";
            const isFolder = item.kind === "FOLDER";
            return (
              <div
                key={item.id}
                onDoubleClick={() => openVaultItem(item)}
                className={`storage-card${isFolder ? " is-folder" : ""}`}
              >
                <div
                  onClick={() => isFolder && setCurrentFolderId(item.id)}
                  className={`storage-card-body${isFolder ? " is-folder" : ""}`}
                >
                  <div className="storage-card-icon">{getFileIcon(item)}</div>
                  <div className="storage-card-name">{item.name}</div>
                  <div className="storage-card-meta">
                    {isFolder ? "Folder • क्लिक करके खोलें" : `${item.sizeKB} KB • ${dateOnly(item.updatedAt)}`}
                  </div>
                </div>

                <div className="storage-card-actions">
                  {isFolder && (
                    <button type="button" onClick={() => setCurrentFolderId(item.id)} className="storage-mini-btn storage-mini-btn-blue">
                      Open
                    </button>
                  )}
                  {officeKind && (
                    <button type="button" onClick={() => setOfficeItem(item)} className="storage-mini-btn storage-mini-btn-indigo">
                      {officeKind === "PDF" ? "📕 View" : "✏️ Open / Edit"}
                    </button>
                  )}
                  {isExcel && onLoadExcelBlob && (
                    <button type="button" onClick={() => onLoadExcelBlob(item.data, item.name)} className="storage-mini-btn storage-mini-btn-green">
                      ⚡ Use Data
                    </button>
                  )}
                  {item.kind === "FILE" && (
                    <button type="button" onClick={() => handleDownload(item)} title="Download" className="storage-mini-btn storage-mini-btn-sky">
                      📥 Download
                    </button>
                  )}
                  <button type="button" onClick={() => handleRename(item)} title="Rename" className="storage-mini-btn storage-mini-btn-muted">
                    ✏️
                  </button>
                  <button type="button" onClick={() => handleDelete(item)} title="Delete" className="storage-mini-btn storage-mini-btn-danger">
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="module-table-wrap table-responsive-box">
          <table className="module-table">
            <thead>
              <tr>
                <th className="module-cell-left">नाम (Name)</th>
                <th>प्रकार</th>
                <th>साइज़</th>
                <th>अपडेट दिनांक</th>
                <th>कार्यवाही</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const officeKind = item.kind === "FILE" ? getOfficeEditorKind(item.name, item.mime) : null;
                const isExcel = officeKind === "EXCEL";
                const isFolder = item.kind === "FOLDER";
                return (
                  <tr key={item.id}>
                    <td
                      onClick={() => openVaultItem(item)}
                      className={`storage-list-name${isFolder || officeKind ? " is-folder" : ""}`}
                    >
                      {getFileIcon(item)} &nbsp; {item.name}
                    </td>
                    <td className="module-cell-center">{item.kind}</td>
                    <td className="module-cell-center module-cell-tnr">{isFolder ? "-" : `${item.sizeKB} KB`}</td>
                    <td className="module-cell-center module-cell-tnr">{dateOnly(item.updatedAt)}</td>
                    <td className="module-cell-center storage-list-actions">
                      {officeKind && (
                        <button type="button" onClick={() => setOfficeItem(item)} className="storage-mini-btn storage-mini-btn-indigo">
                          {officeKind === "PDF" ? "📕 View" : "✏️ Open / Edit"}
                        </button>
                      )}
                      {isExcel && onLoadExcelBlob && (
                        <button type="button" onClick={() => onLoadExcelBlob(item.data, item.name)} className="storage-mini-btn storage-mini-btn-green">⚡ Use Data</button>
                      )}
                      {item.kind === "FILE" && (
                        <button type="button" onClick={() => handleDownload(item)} className="storage-mini-btn storage-mini-btn-sky">📥 Download</button>
                      )}
                      <button type="button" onClick={() => handleRename(item)} className="storage-mini-btn storage-mini-btn-muted">✏️</button>
                      <button type="button" onClick={() => handleDelete(item)} className="storage-mini-btn storage-mini-btn-danger">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* [IN-APP OFFICE SUITE MODAL] */}
      {officeItem && (
        <InbuiltOfficeEditor
          item={officeItem}
          onSaveFile={handleSaveOfficeFile}
          onClose={() => setOfficeItem(null)}
          language={language}
        />
      )}
    </div>
  );
}
