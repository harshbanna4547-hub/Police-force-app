import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import InbuiltOfficeEditor from "../../components/shared/InbuiltOfficeEditor";
import {
  getDistrictStorageBackupFolderId,
  openDriveVaultDB,
  saveDistrictOfflineBackup
} from "../../utils/vaultStorage";
import {
  buildCopySubtree,
  canMoveItemToTarget,
  collectDescendantIds,
  getOfficeEditorKind,
  getStorageItemSummary,
  getVaultItemPath,
  isStrengthVaultFolder,
  RECYCLE_BIN_ID,
  stripTrashMetadata
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

  // Windows Explorer & Office Suite States
  const [officeItem, setOfficeItem] = useState(null);
  const [clipboard, setClipboard] = useState(null); // { mode: "CUT" | "COPY", itemId: string, name: string }
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type, item }
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [moveTargetItem, setMoveTargetItem] = useState(null);

  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  const loadAllItems = useCallback(async () => {
    const db = await openDriveVaultDB();
    const tx = db.transaction("drive_items", "readonly");
    const req = tx.objectStore("drive_items").getAll();
    req.onsuccess = async () => {
      const existing = getStorageItemSummary(req.result, activeProfile);
      const rootFolderNames = new Set(
        existing
          .filter((x) => (x.parentId === "ROOT" || x.originalParentId === "ROOT") && x.kind === "FOLDER")
          .map((x) => x.name)
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
    const refreshItems = () => loadAllItems();
    window.addEventListener("police-vault-updated", refreshItems);
    window.addEventListener("police-vault-cloud-updated", refreshItems);
    return () => {
      window.removeEventListener("police-vault-updated", refreshItems);
      window.removeEventListener("police-vault-cloud-updated", refreshItems);
    };
  }, [loadAllItems]);

  // Dismiss context menu on outside click, Escape key, or scroll
  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = () => setContextMenu(null);
    const onPointerDown = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("blur", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("blur", closeMenu);
    };
  }, [contextMenu]);

  // Clamp context menu coordinates via ref cleanly (zero inline JSX styles)
  useLayoutEffect(() => {
    const el = contextMenuRef.current;
    if (!el || !contextMenu) return;
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - rect.width - 10);
    const maxY = Math.max(8, window.innerHeight - rect.height - 10);
    el.style.left = `${Math.max(8, Math.min(contextMenu.x, maxX))}px`;
    el.style.top = `${Math.max(8, Math.min(contextMenu.y, maxY))}px`;
  }, [contextMenu]);

  const putItemsBatch = async (itemList) => {
    const db = await openDriveVaultDB();
    return new Promise((res, rej) => {
      const tx = db.transaction("drive_items", "readwrite");
      const store = tx.objectStore("drive_items");
      itemList.forEach((entry) => store.put(entry));
      tx.oncomplete = () => {
        window.dispatchEvent(new Event("police-vault-updated"));
        res(true);
      };
      tx.onerror = () => rej(tx.error);
    });
  };

  const deleteIdsBatch = async (ids) => {
    const db = await openDriveVaultDB();
    return new Promise((res, rej) => {
      const tx = db.transaction("drive_items", "readwrite");
      const store = tx.objectStore("drive_items");
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => {
        window.dispatchEvent(new Event("police-vault-updated"));
        res(true);
      };
      tx.onerror = () => rej(tx.error);
    });
  };

  const saveItemToDB = async (item) => putItemsBatch([item]);

  const targetCreateFolderId = currentFolderId === RECYCLE_BIN_ID ? "ROOT" : currentFolderId;

  const handleCreateFolder = async () => {
    const folderName = prompt(english ? "Enter new folder name:" : "नए फोल्डर का नाम लिखें:");
    if (!folderName || !folderName.trim()) return;
    await saveItemToDB({
      id: "fld_" + Date.now(),
      parentId: targetCreateFolderId,
      kind: "FOLDER",
      name: folderName.trim(),
      district: activeProfile,
      isTrashed: false,
      updatedAt: new Date().toISOString()
    });
    await loadAllItems();
  };

  const handleUploadFiles = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    const newItems = [];
    for (const file of fileList) {
      const buffer = await file.arrayBuffer();
      newItems.push({
        id: "fil_" + Date.now() + Math.random().toString(36).slice(2, 6),
        parentId: targetCreateFolderId,
        kind: "FILE",
        name: file.name,
        mime: file.type,
        sizeKB: (file.size / 1024).toFixed(1),
        district: activeProfile,
        isTrashed: false,
        updatedAt: new Date().toISOString(),
        data: buffer
      });
    }
    await putItemsBatch(newItems);
    e.target.value = "";
    await loadAllItems();
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
        parentId: targetCreateFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sizeKB: (out.byteLength / 1024).toFixed(1),
        district: activeProfile,
        isTrashed: false,
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
        parentId: targetCreateFolderId,
        kind: "FILE",
        name: fName,
        mime: "application/msword",
        sizeKB: (buf.byteLength / 1024).toFixed(1),
        district: activeProfile,
        isTrashed: false,
        updatedAt: new Date().toISOString(),
        data: buf
      };
    }
    await saveItemToDB(createdItem);
    await loadAllItems();
    setOfficeItem(createdItem);
  };

  // [OFFICE SUITE] Save edits from Excel, Word, or PDF Editor back to IndexedDB + OneDrive Sync
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
      parentId: currentFolderId === RECYCLE_BIN_ID ? "ROOT" : currentFolderId,
      kind: "FILE",
      name: `${activeProfile}_Live_Backup_${stamp}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeKB: (out.byteLength / 1024).toFixed(1),
      district: activeProfile,
      isTrashed: false,
      updatedAt: new Date().toISOString(),
      data: out
    });
    await loadAllItems();
    alert("✔ वर्तमान पोर्टल का पूरा डेटा इस फोल्डर में Excel फ़ाइल के रूप में सेव हो गया है!");
  };

  // Inline Rename Actions
  const startInlineRename = (item) => {
    setRenamingId(item.id);
    setRenameDraft(item.name);
    setContextMenu(null);
  };

  const commitInlineRename = async (item) => {
    const nextName = renameDraft.trim();
    setRenamingId(null);
    if (!nextName || nextName === item.name) return;
    await saveItemToDB({ ...item, name: nextName, updatedAt: new Date().toISOString() });
    await loadAllItems();
  };

  const handleDownload = (item) => {
    if (!item || item.kind !== "FILE" || !item.data) return;
    const blob = new Blob([item.data], { type: item.mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cut / Copy / Paste / Move Operations
  const handleCutItem = (item) => {
    setClipboard({ mode: "CUT", itemId: item.id, name: item.name });
    setContextMenu(null);
  };

  const handleCopyItem = (item) => {
    setClipboard({ mode: "COPY", itemId: item.id, name: item.name });
    setContextMenu(null);
  };

  const handlePasteInto = async (targetFolderId) => {
    if (!clipboard || targetFolderId === RECYCLE_BIN_ID) return;
    const source = items.find((i) => i.id === clipboard.itemId && !i.isTrashed);
    if (!source) {
      setClipboard(null);
      setContextMenu(null);
      return;
    }

    if (clipboard.mode === "CUT") {
      if (!canMoveItemToTarget(source, targetFolderId, items)) {
        alert(english ? "Cannot move a folder into itself or the same location." : "फ़ोल्डर को स्वयं के अंदर या उसी स्थान पर मूव नहीं किया जा सकता।");
        return;
      }
      await saveItemToDB({
        ...source,
        parentId: targetFolderId,
        updatedAt: new Date().toISOString()
      });
      setClipboard(null);
    } else {
      const clones = buildCopySubtree(source, targetFolderId, items);
      await putItemsBatch(clones);
    }
    setContextMenu(null);
    await loadAllItems();
  };

  const handleMoveToTarget = async (targetFolderId) => {
    if (!moveTargetItem || !canMoveItemToTarget(moveTargetItem, targetFolderId, items)) return;
    await saveItemToDB({
      ...moveTargetItem,
      parentId: targetFolderId,
      updatedAt: new Date().toISOString()
    });
    setMoveTargetItem(null);
    await loadAllItems();
  };

  // Recycle Bin Actions (Soft Delete, Restore, Permanent Delete, Empty Bin)
  const handleMoveToRecycleBin = async (item) => {
    setContextMenu(null);
    const now = new Date().toISOString();
    const originalPath = getVaultItemPath(item, items);
    const descendantIds = item.kind === "FOLDER" ? collectDescendantIds(item.id, items) : [];
    const targetIds = new Set([item.id, ...descendantIds]);

    const updates = items
      .filter((entry) => targetIds.has(entry.id))
      .map((entry) => ({
        ...entry,
        isTrashed: true,
        trashedAt: now,
        trashedRootId: item.id,
        originalParentId: entry.id === item.id ? item.parentId : entry.parentId,
        originalPath: entry.id === item.id ? originalPath : getVaultItemPath(entry, items)
      }));

    await putItemsBatch(updates);
    if (clipboard?.itemId && targetIds.has(clipboard.itemId)) setClipboard(null);
    await loadAllItems();
  };

  const handleRestoreItem = async (item) => {
    setContextMenu(null);
    const descendantIds = item.kind === "FOLDER" ? collectDescendantIds(item.id, items) : [];
    const targetIds = new Set([item.id, ...descendantIds]);
    const activeFolders = new Set(items.filter((i) => !i.isTrashed && i.kind === "FOLDER").map((i) => i.id));
    const fallbackParent =
      item.originalParentId && (item.originalParentId === "ROOT" || activeFolders.has(item.originalParentId))
        ? item.originalParentId
        : "ROOT";

    const updates = items
      .filter((entry) => targetIds.has(entry.id))
      .map((entry) => ({
        ...stripTrashMetadata(entry),
        isTrashed: false,
        parentId: entry.id === item.id ? fallbackParent : entry.parentId,
        updatedAt: new Date().toISOString()
      }));

    await putItemsBatch(updates);
    await loadAllItems();
  };

  const handleDeletePermanently = async (item) => {
    setContextMenu(null);
    if (!window.confirm(`क्या आप "${item.name}" को हमेशा के लिए स्थायी रूप से हटाना चाहते हैं?`)) return;
    const descendantIds = item.kind === "FOLDER" ? collectDescendantIds(item.id, items) : [];
    await deleteIdsBatch([item.id, ...descendantIds]);
    await loadAllItems();
  };

  const trashedTopItems = useMemo(() => {
    const trashed = items.filter((i) => i.isTrashed);
    const trashedIdSet = new Set(trashed.map((i) => i.id));
    // Show top-level trashed entries (whose parent wasn't also trashed inside the same delete action)
    return trashed.filter((i) => !i.trashedRootId || i.trashedRootId === i.id || !trashedIdSet.has(i.trashedRootId));
  }, [items]);

  const handleEmptyRecycleBin = async () => {
    setContextMenu(null);
    const trashedIds = items.filter((i) => i.isTrashed).map((i) => i.id);
    if (!trashedIds.length) return;
    if (!window.confirm(english ? `Permanently empty all ${trashedTopItems.length} item(s) from Recycle Bin?` : `क्या Recycle Bin की सभी ${trashedTopItems.length} आइटम्स को हमेशा के लिए हटाना है?`)) {
      return;
    }
    await deleteIdsBatch(trashedIds);
    await loadAllItems();
  };

  const handleRestoreAllRecycleBin = async () => {
    setContextMenu(null);
    if (!trashedTopItems.length) return;
    const activeFolders = new Set(items.filter((i) => !i.isTrashed && i.kind === "FOLDER").map((i) => i.id));
    const updates = items
      .filter((entry) => entry.isTrashed)
      .map((entry) => {
        const isRootTrashed = !entry.trashedRootId || entry.trashedRootId === entry.id;
        const targetParent = isRootTrashed
          ? (entry.originalParentId && (entry.originalParentId === "ROOT" || activeFolders.has(entry.originalParentId))
            ? entry.originalParentId
            : "ROOT")
          : entry.parentId;
        return {
          ...stripTrashMetadata(entry),
          isTrashed: false,
          parentId: targetParent,
          updatedAt: new Date().toISOString()
        };
      });
    await putItemsBatch(updates);
    await loadAllItems();
  };

  const breadcrumbs = useMemo(() => {
    if (currentFolderId === RECYCLE_BIN_ID) return [];
    const path = [];
    let curr = currentFolderId;
    while (curr && curr !== "ROOT") {
      const found = items.find((i) => i.id === curr && !i.isTrashed);
      if (!found) break;
      path.unshift(found);
      curr = found.parentId;
    }
    return path;
  }, [items, currentFolderId]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (currentFolderId === RECYCLE_BIN_ID) {
      const binList = q
        ? trashedTopItems.filter((i) => i.name.toLowerCase().includes(q))
        : trashedTopItems;
      return [...binList].sort((a, b) => String(b.trashedAt || "").localeCompare(String(a.trashedAt || "")));
    }

    const activeItems = items.filter((i) => !i.isTrashed);
    const list = q
      ? activeItems.filter((i) => i.name.toLowerCase().includes(q))
      : activeItems.filter((i) => i.parentId === currentFolderId);

    return [...list].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, currentFolderId, search, trashedTopItems]);

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
    Updated: dateOnly(item.trashedAt || item.updatedAt)
  })), [visibleItems]);

  const inStrengthFolder = useMemo(() => isStrengthVaultFolder(breadcrumbs), [breadcrumbs]);
  const inRecycleBin = currentFolderId === RECYCLE_BIN_ID;
  const isAtRootDesktop = currentFolderId === "ROOT" && !search.trim();

  const navigateBackUp = () => {
    if (search.trim()) {
      setSearch("");
      return;
    }
    if (inRecycleBin) {
      setCurrentFolderId("ROOT");
      return;
    }
    if (breadcrumbs.length <= 1) {
      setCurrentFolderId("ROOT");
    } else {
      setCurrentFolderId(breadcrumbs[breadcrumbs.length - 2].id);
    }
  };

  const openVaultItem = (item) => {
    if (inRecycleBin || renamingId === item.id) return;
    if (item.kind === "FOLDER") {
      setCurrentFolderId(item.id);
      setSearch("");
      return;
    }
    if (getOfficeEditorKind(item.name, item.mime)) {
      setOfficeItem(item);
      return;
    }
    handleDownload(item);
  };

  const openContextMenu = (e, type, item = null) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX ?? e.currentTarget.getBoundingClientRect().left;
    const clientY = e.clientY ?? e.currentTarget.getBoundingClientRect().bottom;
    setContextMenu({ x: clientX, y: clientY, type, item });
  };

  const activeFolderDestinations = useMemo(
    () => items.filter((i) => !i.isTrashed && i.kind === "FOLDER").sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  return (
    <div className="storage-vault-module module-panel">
      <ModuleHeaderToolbar
        title={english ? "🖥️ Storage Desktop" : "🖥️ स्टोरेज डेस्कटॉप (Storage Vault)"}
        search={search}
        onSearchChange={setSearch}
        rows={storageExportRows}
        fileName="Storage_Vault_Index"
        language={language}
        searchPlaceholder={english ? "🔍 Search files or folders..." : "🔍 डेस्कटॉप में फ़ाइल/फोल्डर खोजें..."}
        extraActions={(
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "GRID" ? "LIST" : "GRID")}
            className="storage-view-toggle"
          >
            {viewMode === "GRID" ? "☰ List" : "⊞ Desktop Icons"}
          </button>
        )}
      />

      {/* [TOOLBAR] Main Storage Toolbar (केवल 4 सामान्य फ़ाइल बटन) */}
      <div className="storage-action-bar">
        <div className="storage-action-group">
          <button type="button" onClick={handleCreateFolder} className="storage-btn storage-btn-navy">
            📁 + New Folder
          </button>

          <label className="storage-btn storage-btn-green">
            ⬆️ Upload Files
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleUploadFiles}
              className="storage-hidden-input"
            />
          </label>

          <button type="button" onClick={() => handleCreateNewDoc("EXCEL")} className="storage-btn storage-btn-emerald">
            📊 + New Excel
          </button>

          <button type="button" onClick={() => handleCreateNewDoc("WORD")} className="storage-btn storage-btn-blue">
            📝 + New Word
          </button>
        </div>

        {clipboard && (
          <div className="storage-clipboard-badge">
            <span>
              {clipboard.mode === "CUT" ? "✂️ Cut:" : "📋 Copied:"} {clipboard.name}
            </span>
            <button
              type="button"
              onClick={() => setClipboard(null)}
              className="storage-clipboard-clear"
              title="Clear Clipboard"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* [NAVIGATION] Back / Up Button + Breadcrumb Path Bar */}
      <div className="storage-explorer-nav">
        <button
          type="button"
          onClick={navigateBackUp}
          disabled={currentFolderId === "ROOT" && !search.trim()}
          className="storage-back-btn"
        >
          ⬅️ {english ? "Back / Up" : "वापस / ऊपर"}
        </button>

        <div className="storage-breadcrumbs">
          <span
            onClick={() => { setCurrentFolderId("ROOT"); setSearch(""); }}
            className="storage-crumb-link"
          >
            🖥️ Storage Desktop
          </span>

          {inRecycleBin && (
            <>
              <span className="storage-crumb-sep">&gt;</span>
              <span className="storage-crumb-link">🗑️ Recycle Bin</span>
            </>
          )}

          {breadcrumbs.map((b) => (
            <React.Fragment key={b.id}>
              <span className="storage-crumb-sep">&gt;</span>
              <span
                onClick={() => { setCurrentFolderId(b.id); setSearch(""); }}
                className="storage-crumb-link"
              >
                {b.name}
              </span>
            </React.Fragment>
          ))}
        </div>
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

      {/* [CONTEXTUAL BAR] Recycle Bin Header Controls */}
      {inRecycleBin && (
        <div className="storage-recycle-bar">
          <span className="storage-recycle-label">
            🗑️ {english
              ? `Recycle Bin (${trashedTopItems.length} item${trashedTopItems.length === 1 ? "" : "s"}) — Right-click any item to Restore or Delete`
              : `रीसायकल बिन (${trashedTopItems.length} आइटम) — Restore या स्थायी Delete के लिए राइट-क्लिक या ⋮ दबाएं`}
          </span>
          <div className="storage-action-group">
            <button
              type="button"
              onClick={handleRestoreAllRecycleBin}
              disabled={!trashedTopItems.length}
              className="storage-btn storage-btn-green"
            >
              ♻️ {english ? "Restore All" : "सभी Restore करें"}
            </button>
            <button
              type="button"
              onClick={handleEmptyRecycleBin}
              disabled={!trashedTopItems.length}
              className="storage-btn storage-btn-danger"
            >
              🧹 {english ? "Empty Recycle Bin" : "Recycle Bin खाली करें"}
            </button>
          </div>
        </div>
      )}

      {/* [EXPLORER CANVAS] Supports Right-Click on Empty Space */}
      <div
        className="storage-desktop-canvas"
        onContextMenu={(e) => {
          if (inRecycleBin) {
            openContextMenu(e, "RECYCLE_EMPTY");
          } else {
            openContextMenu(e, "EMPTY");
          }
        }}
      >
        {visibleItems.length === 0 && !isAtRootDesktop ? (
          <div className="storage-empty-state">
            <div className="storage-empty-icon">{inRecycleBin ? "🗑️" : "📂"}</div>
            <div className="storage-empty-title">
              {inRecycleBin
                ? (english ? "Recycle Bin is empty" : "Recycle Bin खाली है")
                : (english ? "This folder is empty" : "यह फोल्डर खाली है")}
            </div>
            <small>
              {inRecycleBin
                ? (english ? "Deleted files & folders appear here safely before permanent deletion." : "हटाई गई फ़ाइलें और फ़ोल्डर स्थायी रूप से डिलीट होने से पहले यहाँ सुरक्षित रहते हैं।")
                : (english ? "Right-click empty space or use the toolbar above to create folders, Excel, Word, or upload files." : "नया फोल्डर, Excel, Word बनाने या फ़ाइल अपलोड करने के लिए खाली जगह पर राइट-क्लिक करें।")}
            </small>
          </div>
        ) : viewMode === "GRID" ? (
          <div className="storage-grid">
            {visibleItems.map((item) => {
              const isFolder = item.kind === "FOLDER";
              const isCut = clipboard?.mode === "CUT" && clipboard.itemId === item.id;
              const isRenaming = renamingId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => openVaultItem(item)}
                  onDoubleClick={() => openVaultItem(item)}
                  onContextMenu={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                  className={`storage-card${isFolder ? " is-folder" : ""}${isCut ? " is-cut" : ""}`}
                >
                  <button
                    type="button"
                    aria-label="More options"
                    onClick={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                    className="storage-card-menu-btn"
                  >
                    ⋮
                  </button>

                  <div className="storage-card-body">
                    <div className="storage-card-icon">{getFileIcon(item)}</div>
                    {isRenaming ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameDraft}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => commitInlineRename(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitInlineRename(item);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="storage-rename-input"
                      />
                    ) : (
                      <div className="storage-card-name">{item.name}</div>
                    )}
                    <div className="storage-card-meta">
                      {inRecycleBin
                        ? `${item.originalPath || "Desktop"} · ${dateOnly(item.trashedAt)}`
                        : isFolder
                          ? (english ? "Folder" : "फ़ोल्डर")
                          : `${item.sizeKB} KB • ${dateOnly(item.updatedAt)}`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Permanently Pinned Recycle Bin Icon on Storage Desktop */}
            {isAtRootDesktop && (
              <div
                onClick={() => { setCurrentFolderId(RECYCLE_BIN_ID); setSearch(""); }}
                onDoubleClick={() => { setCurrentFolderId(RECYCLE_BIN_ID); setSearch(""); }}
                onContextMenu={(e) => openContextMenu(e, "RECYCLE_BIN")}
                className="storage-card is-recycle"
              >
                <span className="storage-recycle-badge">{trashedTopItems.length}</span>
                <button
                  type="button"
                  aria-label="Recycle Bin options"
                  onClick={(e) => openContextMenu(e, "RECYCLE_BIN")}
                  className="storage-card-menu-btn"
                >
                  ⋮
                </button>
                <div className="storage-card-body">
                  <div className="storage-card-icon">🗑️</div>
                  <div className="storage-card-name">Recycle Bin</div>
                  <div className="storage-card-meta">
                    {trashedTopItems.length === 0
                      ? (english ? "Empty" : "खाली")
                      : `${trashedTopItems.length} ${english ? "items" : "आइटम"}`}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="module-table-wrap table-responsive-box">
            <table className="module-table">
              <thead>
                <tr>
                  <th className="module-cell-left">{english ? "Name" : "नाम (Name)"}</th>
                  <th>{english ? "Type" : "प्रकार"}</th>
                  <th>{inRecycleBin ? (english ? "Original Location" : "मूल स्थान") : (english ? "Size" : "साइज़")}</th>
                  <th>{inRecycleBin ? (english ? "Deleted On" : "हटाने की तिथि") : (english ? "Updated" : "अपडेट दिनांक")}</th>
                  <th>{english ? "Menu" : "विकल्प"}</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const isFolder = item.kind === "FOLDER";
                  const isRenaming = renamingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onContextMenu={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                    >
                      <td
                        onClick={() => openVaultItem(item)}
                        className={`storage-list-name${isFolder ? " is-folder" : ""}`}
                      >
                        {isRenaming ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitInlineRename(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitInlineRename(item);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="storage-rename-input"
                          />
                        ) : (
                          <>
                            {getFileIcon(item)} &nbsp; {item.name}
                          </>
                        )}
                      </td>
                      <td className="module-cell-center">{item.kind}</td>
                      <td className="module-cell-center module-cell-tnr">
                        {inRecycleBin ? (item.originalPath || "Desktop") : isFolder ? "-" : `${item.sizeKB} KB`}
                      </td>
                      <td className="module-cell-center module-cell-tnr">
                        {dateOnly(inRecycleBin ? item.trashedAt : item.updatedAt)}
                      </td>
                      <td className="module-cell-center">
                        <button
                          type="button"
                          onClick={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                          className="storage-list-menu-btn"
                        >
                          ⋮
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {isAtRootDesktop && (
                  <tr
                    onClick={() => { setCurrentFolderId(RECYCLE_BIN_ID); setSearch(""); }}
                    onContextMenu={(e) => openContextMenu(e, "RECYCLE_BIN")}
                  >
                    <td className="storage-list-name is-folder">
                      🗑️ &nbsp; Recycle Bin ({trashedTopItems.length})
                    </td>
                    <td className="module-cell-center">SYSTEM</td>
                    <td className="module-cell-center module-cell-tnr">-</td>
                    <td className="module-cell-center module-cell-tnr">-</td>
                    <td className="module-cell-center">
                      <button
                        type="button"
                        onClick={(e) => openContextMenu(e, "RECYCLE_BIN")}
                        className="storage-list-menu-btn"
                      >
                        ⋮
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* [WINDOWS CONTEXT MENU PORTAL] */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          role="menu"
          className="storage-context-menu"
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.type === "ITEM" && contextMenu.item && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  openVaultItem(target);
                }}
                className="storage-context-item"
              >
                📂 Open
              </button>
              {contextMenu.item.kind === "FILE" && getOfficeEditorKind(contextMenu.item.name, contextMenu.item.mime) === "EXCEL" && onLoadExcelBlob && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const target = contextMenu.item;
                    setContextMenu(null);
                    onLoadExcelBlob(target.data, target.name);
                  }}
                  className="storage-context-item"
                >
                  ⚡ Load Master Data in Portal
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => startInlineRename(contextMenu.item)}
                className="storage-context-item"
              >
                ✏️ Rename
              </button>
              <div className="storage-context-divider" />
              <button
                type="button"
                role="menuitem"
                onClick={() => handleCutItem(contextMenu.item)}
                className="storage-context-item"
              >
                ✂️ Cut
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleCopyItem(contextMenu.item)}
                className="storage-context-item"
              >
                📋 Copy
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!clipboard}
                onClick={() => {
                  const destFolderId = contextMenu.item.kind === "FOLDER" ? contextMenu.item.id : currentFolderId;
                  handlePasteInto(destFolderId);
                }}
                className="storage-context-item"
              >
                📥 Paste
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoveTargetItem(contextMenu.item);
                  setContextMenu(null);
                }}
                className="storage-context-item"
              >
                📁 Move to Folder...
              </button>
              <div className="storage-context-divider" />
              <button
                type="button"
                role="menuitem"
                disabled={contextMenu.item.kind !== "FILE"}
                onClick={() => {
                  const target = contextMenu.item;
                  setContextMenu(null);
                  handleDownload(target);
                }}
                className="storage-context-item"
              >
                ⬇️ Download to PC
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMoveToRecycleBin(contextMenu.item)}
                className="storage-context-item is-danger"
              >
                🗑️ Move to Recycle Bin
              </button>
            </>
          )}

          {contextMenu.type === "EMPTY" && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setContextMenu(null); handleCreateFolder(); }}
                className="storage-context-item"
              >
                📁 + New Folder
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setContextMenu(null); handleCreateNewDoc("EXCEL"); }}
                className="storage-context-item"
              >
                📊 + New Excel
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setContextMenu(null); handleCreateNewDoc("WORD"); }}
                className="storage-context-item"
              >
                📝 + New Word
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  fileInputRef.current?.click();
                }}
                className="storage-context-item"
              >
                ⬆️ Upload Files
              </button>
              <div className="storage-context-divider" />
              <button
                type="button"
                role="menuitem"
                disabled={!clipboard}
                onClick={() => handlePasteInto(currentFolderId)}
                className="storage-context-item"
              >
                📥 Paste {clipboard ? `(${clipboard.name})` : ""}
              </button>
            </>
          )}

          {contextMenu.type === "RECYCLE_ITEM" && contextMenu.item && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleRestoreItem(contextMenu.item)}
                className="storage-context-item"
              >
                ♻️ Restore
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleDeletePermanently(contextMenu.item)}
                className="storage-context-item is-danger"
              >
                ❌ Delete Permanently
              </button>
            </>
          )}

          {(contextMenu.type === "RECYCLE_BIN" || contextMenu.type === "RECYCLE_EMPTY") && (
            <>
              {contextMenu.type === "RECYCLE_BIN" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setContextMenu(null);
                    setCurrentFolderId(RECYCLE_BIN_ID);
                    setSearch("");
                  }}
                  className="storage-context-item"
                >
                  📂 Open Recycle Bin
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={!trashedTopItems.length}
                onClick={handleRestoreAllRecycleBin}
                className="storage-context-item"
              >
                ♻️ Restore All Items
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!trashedTopItems.length}
                onClick={handleEmptyRecycleBin}
                className="storage-context-item is-danger"
              >
                🧹 Empty Recycle Bin
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* [MOVE TO FOLDER PICKER MODAL] */}
      {moveTargetItem && (
        <div
          className="storage-move-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMoveTargetItem(null);
          }}
        >
          <div className="storage-move-modal" role="dialog" aria-modal="true" aria-label="Move to Folder">
            <h4 className="storage-move-title">
              📁 Move "{moveTargetItem.name}" to:
            </h4>
            <div className="storage-move-list">
              <button
                type="button"
                disabled={!canMoveItemToTarget(moveTargetItem, "ROOT", items)}
                onClick={() => handleMoveToTarget("ROOT")}
                className="storage-move-option"
              >
                🖥️ Storage Desktop (Root)
              </button>
              {activeFolderDestinations.map((folder) => {
                const allowed = canMoveItemToTarget(moveTargetItem, folder.id, items);
                return (
                  <button
                    key={folder.id}
                    type="button"
                    disabled={!allowed}
                    onClick={() => handleMoveToTarget(folder.id)}
                    className="storage-move-option"
                  >
                    📁 {folder.name}
                  </button>
                );
              })}
            </div>
            <div className="storage-move-footer">
              <button
                type="button"
                onClick={() => setMoveTargetItem(null)}
                className="storage-back-btn"
              >
                ✕ {english ? "Cancel" : "रद्द करें"}
              </button>
            </div>
          </div>
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
