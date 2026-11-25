// src/modules/13_storage/StorageVaultModule.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { installFontInApp, loadAllInstalledFonts, removeInstalledFont } from "../../utils/fontInstaller";
import { openDriveVaultDB } from "../../utils/vaultStorage";
import { getStorageItemSummary } from "./storageLogic";
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
  "13. Roster (मासिक थाना रोस्टर)"
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
  fileName,
  hasData,
  hasUnsavedChanges,
  onSaveToExcel,
  onExportMasterFile,
  isExportingMaster,
  onRemoveDistrictData
}) {
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState("ROOT");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("GRID"); // GRID | LIST

  // Inbuilt Hindi Font Installer States
  const [installedFonts, setInstalledFonts] = useState([]);
  const [fontChoice, setFontChoice] = useState("DevLys 010");
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
            id: `mod_fld_${idx}_${Date.now()}`,
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
  const handleCreateNewDoc = async (docType) => {
    const rawName = prompt(docType === "EXCEL" ? "नई Excel फ़ाइल का नाम लिखें:" : "नई Word फ़ाइल का नाम लिखें:");
    if (!rawName || !rawName.trim()) return;

    if (docType === "EXCEL") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([{ "क्र.सं.": 1, "पद": "", "बेल्ट नं.": "", "नाम": "", "पदस्थापन": "" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fName = rawName.endsWith(".xlsx") ? rawName : `${rawName.trim()}.xlsx`;
      await saveItemToDB({
        id: "fil_" + Date.now(),
        parentId: currentFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeKB: (out.byteLength / 1024).toFixed(1),
        district: activeProfile,
        updatedAt: new Date().toISOString(),
        data: out
      });
    } else {
      const html = `<html><head><meta charset="utf-8"><style>body{font-family:'DevLys 010',Arial;font-size:16pt;}</style></head><body><h2 style="text-align:center;">कार्यालय पुलिस अधीक्षक ${activeProfile}</h2><p></p></body></html>`;
      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
      const buf = await blob.arrayBuffer();
      const fName = rawName.endsWith(".doc") ? rawName : `${rawName.trim()}.doc`;
      await saveItemToDB({
        id: "fil_" + Date.now(),
        parentId: currentFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/msword",
        sizeKB: (buf.byteLength / 1024).toFixed(1),
        district: activeProfile,
        updatedAt: new Date().toISOString(),
        data: buf
      });
    }
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
  return (
    <div className="storage-vault-module" style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "18px", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
      {/* ऊपरी Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid #E2E8F0", paddingBottom: "12px", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {hasData && (
            <button type="button" onClick={onExportMasterFile} disabled={isExportingMaster} style={{ backgroundColor: "#0284C7", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", cursor: isExportingMaster ? "wait" : "pointer", fontSize: "0.84rem" }}>
              {isExportingMaster ? "⏳ Exporting..." : "📥 Export Master File"}
            </button>
          )}
          {fileName && hasUnsavedChanges && (
            <button type="button" onClick={onSaveToExcel} style={{ backgroundColor: "#7C3AED", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
              💾 Save Excel Changes
            </button>
          )}
          {fileName && (
            <button type="button" onClick={onRemoveDistrictData} style={{ backgroundColor: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.84rem" }}>
              🗑️ Remove District Data
            </button>
          )}
          <button onClick={handleCreateFolder} style={{ backgroundColor: "#0B1E3D", color: "#FFD700", border: "none", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
            📁+ New Folder
          </button>

          <label style={{ backgroundColor: "#16A34A", color: "#fff", padding: "8px 14px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
            ⬆️ Upload Files
            <input type="file" multiple onChange={handleUploadFiles} style={{ display: "none" }} />
          </label>

          <button onClick={() => handleCreateNewDoc("EXCEL")} style={{ backgroundColor: "#059669", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
            📊+ New Excel
          </button>

          <button onClick={() => handleCreateNewDoc("WORD")} style={{ backgroundColor: "#2563EB", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
            📝+ New Word
          </button>

          <button onClick={handleSaveLivePortalBackup} style={{ backgroundColor: "#7C3AED", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.84rem" }}>
            💾 Save Live Data Here
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍 Drive में फ़ाइल/फोल्डर खोजें..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #94A3B8", minWidth: "200px" }}
          />
          <button
            onClick={() => setViewMode(viewMode === "GRID" ? "LIST" : "GRID")}
            style={{ backgroundColor: "#F1F5F9", border: "1px solid #CBD5E1", padding: "7px 12px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            {viewMode === "GRID" ? "☰ List" : "⊞ Grid"}
          </button>
        </div>
      </div>

      {/* Inbuilt Hindi Font Installer पट्टी */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", backgroundColor: "#FEF3C7", border: "1px solid #F59E0B", padding: "10px 14px", borderRadius: "10px", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <strong style={{ color: "#92400E" }}>🔤 Inbuilt Hindi Font Installer:</strong>
          <select value={fontChoice} onChange={(e) => setFontChoice(e.target.value)} style={{ padding: "5px 8px", borderRadius: "6px", border: "1px solid #D97706" }}>
            <option value="DevLys 010">DevLys 010</option>
            <option value="Kruti Dev 010">Kruti Dev 010</option>
            <option value="Mangal">Mangal (Unicode)</option>
          </select>
          <label style={{ backgroundColor: "#D97706", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.82rem" }}>
            ➕ .TTF फ़ॉन्ट फ़ाइल चुनें (Install)
            <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontInstall} style={{ display: "none" }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {installedFonts.map((f) => (
            <span key={f.fontName} style={{ backgroundColor: "#fff", border: "1px solid #D97706", padding: "3px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: "bold", color: "#78350F" }}>
              ✔ {f.fontName}
              <button
                onClick={async () => {
                  await removeInstalledFont(f.fontName);
                  setInstalledFonts(await loadAllInstalledFonts());
                }}
                style={{ marginLeft: "6px", border: "none", background: "none", color: "#DC2626", cursor: "pointer", fontWeight: "bold" }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", backgroundColor: "#F8FAFC", padding: "8px 12px", borderRadius: "8px", marginBottom: "14px", fontSize: "0.9rem" }}>
        <span onClick={() => { setCurrentFolderId("ROOT"); setSearch(""); }} style={{ cursor: "pointer", fontWeight: "bold", color: "#1D63DC" }}>
          🗄️ {activeProfile} Drive
        </span>
        {breadcrumbs.map((b) => (
          <React.Fragment key={b.id}>
            <span style={{ color: "#94A3B8" }}>/</span>
            <span onClick={() => { setCurrentFolderId(b.id); setSearch(""); }} style={{ cursor: "pointer", fontWeight: "bold", color: "#1D63DC" }}>
              {b.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B", border: "2px dashed #CBD5E1", borderRadius: "12px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📂</div>
          <div style={{ fontWeight: "bold" }}>यह फोल्डर खाली है</div>
          <small>ऊपर से नया फोल्डर बनाएं या Excel, Word, PDF फ़ाइलें अपलोड करें।</small>
        </div>
      ) : viewMode === "GRID" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "14px" }}>
          {visibleItems.map((item) => {
            const isExcel = item.kind === "FILE" && (item.name.toLowerCase().endsWith(".xlsx") || item.name.toLowerCase().endsWith(".xls"));
            return (
              <div
                key={item.id}
                onDoubleClick={() => item.kind === "FOLDER" && setCurrentFolderId(item.id)}
                style={{ backgroundColor: item.kind === "FOLDER" ? "#EFF6FF" : "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 2px 5px rgba(15,23,42,0.04)" }}
              >
                <div onClick={() => item.kind === "FOLDER" && setCurrentFolderId(item.id)} style={{ cursor: item.kind === "FOLDER" ? "pointer" : "default", textAlign: "center" }}>
                  <div style={{ fontSize: "2.4rem", marginBottom: "6px" }}>{getFileIcon(item)}</div>
                  <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#0F172A", wordBreak: "break-word" }}>{item.name}</div>
                  <div style={{ fontSize: "0.74rem", color: "#64748B", marginTop: "4px" }}>
                    {item.kind === "FOLDER" ? "Folder • क्लिक करके खोलें" : `${item.sizeKB} KB • ${dateOnly(item.updatedAt)}`}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #E2E8F0", flexWrap: "wrap" }}>
                  {item.kind === "FOLDER" && (
                    <button onClick={() => setCurrentFolderId(item.id)} style={{ backgroundColor: "#1D63DC", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "5px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold" }}>
                      Open
                    </button>
                  )}
                  {isExcel && onLoadExcelBlob && (
                    <button onClick={() => onLoadExcelBlob(item.data, item.name)} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "5px", fontSize: "0.75rem", cursor: "pointer", fontWeight: "bold" }}>
                      ⚡ Use Data
                    </button>
                  )}
                  {item.kind === "FILE" && (
                    <button onClick={() => handleDownload(item)} title="Download" style={{ backgroundColor: "#0284C7", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "5px", fontSize: "0.75rem", cursor: "pointer" }}>
                      📥 Download
                    </button>
                  )}
                  <button onClick={() => handleRename(item)} title="Rename" style={{ backgroundColor: "#E2E8F0", color: "#1E293B", border: "none", padding: "4px 8px", borderRadius: "5px", fontSize: "0.75rem", cursor: "pointer" }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(item)} title="Delete" style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "none", padding: "4px 8px", borderRadius: "5px", fontSize: "0.75rem", cursor: "pointer" }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-responsive-box" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#0B1E3D", color: "#fff" }}>
                <th style={{ padding: "8px", textAlign: "left" }}>नाम (Name)</th>
                <th style={{ padding: "8px" }}>प्रकार</th>
                <th style={{ padding: "8px" }}>साइज़</th>
                <th style={{ padding: "8px" }}>अपडेट दिनांक</th>
                <th style={{ padding: "8px" }}>कार्यवाही</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => {
                const isExcel = item.kind === "FILE" && (item.name.toLowerCase().endsWith(".xlsx") || item.name.toLowerCase().endsWith(".xls"));
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #E2E8F0" }}>
                    <td onClick={() => item.kind === "FOLDER" && setCurrentFolderId(item.id)} style={{ padding: "8px", fontWeight: "bold", cursor: item.kind === "FOLDER" ? "pointer" : "default", color: item.kind === "FOLDER" ? "#1D63DC" : "#0F172A" }}>
                      {getFileIcon(item)} &nbsp; {item.name}
                    </td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{item.kind}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{item.kind === "FOLDER" ? "-" : `${item.sizeKB} KB`}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>{dateOnly(item.updatedAt)}</td>
                    <td style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {isExcel && onLoadExcelBlob && (
                        <button onClick={() => onLoadExcelBlob(item.data, item.name)} style={{ backgroundColor: "#16A34A", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "5px", marginRight: "5px", cursor: "pointer", fontSize: "0.78rem" }}>⚡ Use Data</button>
                      )}
                      {item.kind === "FILE" && (
                        <button onClick={() => handleDownload(item)} style={{ backgroundColor: "#0284C7", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "5px", marginRight: "5px", cursor: "pointer", fontSize: "0.78rem" }}>📥 Download</button>
                      )}
                      <button onClick={() => handleRename(item)} style={{ backgroundColor: "#E2E8F0", border: "none", padding: "4px 8px", borderRadius: "5px", marginRight: "5px", cursor: "pointer", fontSize: "0.78rem" }}>✏️</button>
                      <button onClick={() => handleDelete(item)} style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "none", padding: "4px 8px", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem" }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
