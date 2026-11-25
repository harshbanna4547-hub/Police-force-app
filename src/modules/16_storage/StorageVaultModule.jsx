import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import InbuiltOfficeEditor from "../../components/shared/InbuiltOfficeEditor";
import DesktopWindowFrame from "../storage/apps/DesktopWindowFrame";
import ExcelApp from "../storage/apps/ExcelApp";
import WordApp from "../storage/apps/WordApp";
import PhotoViewerApp from "../storage/apps/PhotoViewerApp";
import MediaPlayerApp from "../storage/apps/MediaPlayerApp";
import CodeEditorApp from "../storage/apps/CodeEditorApp";
import CalculatorApp from "../storage/apps/CalculatorApp";
import StickyNotesApp from "../storage/apps/StickyNotesApp";
import GamesApp from "../storage/apps/GamesApp";
import AppStoreApp from "../storage/apps/AppStoreApp";
import {
  getDistrictStorageBackupFolderId,
  openDriveVaultDB,
  saveDistrictOfflineBackup
} from "../../utils/vaultStorage";
import {
  APP_STORE_CATALOG,
  buildCopySubtree,
  canMoveItemToTarget,
  collectDescendantIds,
  deduplicateRootFolders,
  formatIstClockDate,
  getStorageItemSummary,
  getVaultFileAppKind,
  getVaultItemPath,
  isStrengthVaultFolder,
  RECYCLE_BIN_ID,
  stripTrashMetadata,
  WALLPAPER_PRESETS,
  WINDOWS_11_DEFAULT_FOLDERS
} from "./storageLogic";
import "./storage.css";

const WALLPAPER_KEY = "win11_desktop_wallpaper";
const INSTALLED_APPS_KEY = "win11_installed_apps";
const PINNED_APPS_KEY = "win11_pinned_apps";

function readStoredList(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore storage errors
  }
  return fallback;
}

function readStoredWallpaper() {
  try {
    const saved = localStorage.getItem(WALLPAPER_KEY);
    if (WALLPAPER_PRESETS.some((w) => w.id === saved)) return saved;
  } catch {
    // ignore
  }
  return "bloom";
}

function dateOnly(value) {
  const text = String(value || "");
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  return local ? `${String(local[1]).padStart(2, "0")}-${String(local[2]).padStart(2, "0")}-${local[3]}` : text.split(/[T ]/)[0];
}

function getFileIcon(item) {
  if (!item) return "📄";
  if (item.kind === "FOLDER") return "📁";
  const n = String(item.name || "").toLowerCase();
  if (/\.(xlsx?|xlsm|xlsb|xltx?|xltm|csv)$/i.test(n)) return "📊";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "📝";
  if (n.endsWith(".pdf")) return "📕";
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(n)) return "🖼️";
  if (/\.(mp4|webm|mp3|wav|ogg)$/i.test(n)) return "🎬";
  if (/\.(json|js|jsx|css|html|txt|md)$/i.test(n)) return "💻";
  return "📄";
}

function hasRootPrefixMatch(existingRootFolders, targetName) {
  const prefix = targetName.split(".")[0].trim();
  const isBackup = targetName.toLowerCase() === "backup";
  return existingRootFolders.some((entry) => {
    const name = String(entry.name || "");
    if (name === targetName) return true;
    if (isBackup && name.toLowerCase().includes("backup")) return true;
    return /^\d+$/.test(prefix) && name.startsWith(`${prefix}.`);
  });
}

/**
 * [MODULE] StorageVaultModule — Windows 11 Web Desktop Environment
 * Features folder deduplication, 4 wallpapers, App Store, Start Menu,
 * and draggable windowed apps (Excel Pro, Word Pro, Photo Viewer, Media Player, VS Code Lite, Calculator, Sticky Notes, Games).
 */
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
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("GRID"); // GRID | LIST

  // Windows 11 File Explorer Window & History
  const [explorerMode, setExplorerMode] = useState("CLOSED"); // CLOSED | NORMAL | MINIMIZED | MAXIMIZED
  const [navHistory, setNavHistory] = useState(["ROOT"]);
  const [navIndex, setNavIndex] = useState(0);
  const currentFolderId = navHistory[navIndex] || "ROOT";

  // Personalization, Start Menu, Store & Draggable App Windows
  const [wallpaper, setWallpaper] = useState(readStoredWallpaper);
  const [installedApps, setInstalledApps] = useState(() =>
    readStoredList(INSTALLED_APPS_KEY, APP_STORE_CATALOG.filter((a) => a.defaultInstalled).map((a) => a.id))
  );
  const [pinnedApps, setPinnedApps] = useState(() =>
    readStoredList(PINNED_APPS_KEY, APP_STORE_CATALOG.filter((a) => a.defaultPinned).map((a) => a.id))
  );
  const [openWindows, setOpenWindows] = useState([]); // [{ id, appId, title, icon, item?, minimized }]
  const [pdfModalItem, setPdfModalItem] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [startSearch, setStartSearch] = useState("");
  const [clipboard, setClipboard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [moveTargetItem, setMoveTargetItem] = useState(null);
  const [clockLabel, setClockLabel] = useState(() => formatIstClockDate());

  const fileInputRef = useRef(null);
  const contextMenuRef = useRef(null);

  const changeWallpaper = (wpId) => {
    setWallpaper(wpId);
    try {
      localStorage.setItem(WALLPAPER_KEY, wpId);
    } catch {
      // ignore
    }
  };

  const toggleInstallApp = (appId) => {
    const nextInstalled = installedApps.includes(appId)
      ? installedApps.filter((id) => id !== appId)
      : [...installedApps, appId];
    setInstalledApps(nextInstalled);
    const nextPinned = nextInstalled.includes(appId)
      ? pinnedApps
      : pinnedApps.filter((id) => id !== appId);
    setPinnedApps(nextPinned);
    if (!nextInstalled.includes(appId)) {
      setOpenWindows((prev) => prev.filter((w) => w.appId !== appId));
    }
    try {
      localStorage.setItem(INSTALLED_APPS_KEY, JSON.stringify(nextInstalled));
      localStorage.setItem(PINNED_APPS_KEY, JSON.stringify(nextPinned));
    } catch {
      // ignore
    }
  };

  const togglePinApp = (appId) => {
    const nextPinned = pinnedApps.includes(appId)
      ? pinnedApps.filter((id) => id !== appId)
      : [...pinnedApps, appId];
    setPinnedApps(nextPinned);
    try {
      localStorage.setItem(PINNED_APPS_KEY, JSON.stringify(nextPinned));
    } catch {
      // ignore
    }
  };

  const openDesktopApp = (appId, item = null) => {
    setStartMenuOpen(false);
    const catalogMeta = APP_STORE_CATALOG.find((a) => a.id === appId);
    const metaMap = {
      "excel-pro": { title: item?.name || "MS Excel Pro", icon: "📊", width: "wide" },
      "word-pro": { title: item?.name || "MS Word Pro", icon: "📝", width: "wide" },
      "photo-viewer": { title: item?.name || "Photo Viewer", icon: "🖼️", width: "wide" },
      "media-player": { title: item?.name || "Media Player", icon: "🎬", width: "wide" },
      "vscode-lite": { title: item?.name || "VS Code Lite", icon: "💻", width: "wide" },
      calculator: { title: "Calculator", icon: "🧮", width: "compact" },
      "sticky-notes": { title: "Sticky Notes", icon: "🗒️", width: "wide" },
      games: { title: "Classic Games", icon: "🎮", width: "wide" },
      "app-store": { title: "Microsoft App Store", icon: "🛍️", width: "wide" }
    };
    const info = metaMap[appId] || { title: catalogMeta?.title || appId, icon: catalogMeta?.icon || "🪟", width: "wide" };
    const winKey = item ? `${appId}_${item.id}` : appId;

    setOpenWindows((prev) => {
      const exists = prev.find((w) => w.id === winKey);
      if (exists) {
        return [...prev.filter((w) => w.id !== winKey), { ...exists, item: item || exists.item, minimized: false }];
      }
      return [...prev, { id: winKey, appId, title: info.title, icon: info.icon, width: info.width, item, minimized: false }];
    });
  };

  const focusWindow = (winId) => {
    setOpenWindows((prev) => {
      const target = prev.find((w) => w.id === winId);
      if (!target) return prev;
      return [...prev.filter((w) => w.id !== winId), { ...target, minimized: false }];
    });
  };

  const toggleTaskbarWindow = (winId) => {
    setOpenWindows((prev) => {
      const target = prev.find((w) => w.id === winId);
      if (!target) return prev;
      if (target.minimized) {
        return [...prev.filter((w) => w.id !== winId), { ...target, minimized: false }];
      }
      return prev.map((w) => (w.id === winId ? { ...w, minimized: true } : w));
    });
  };

  const navigateExplorerTo = useCallback((folderId) => {
    setExplorerMode((prev) => (prev === "MAXIMIZED" ? "MAXIMIZED" : "NORMAL"));
    setNavHistory((prev) => {
      const sliced = prev.slice(0, navIndex + 1);
      if (sliced[sliced.length - 1] === folderId) return sliced;
      const next = [...sliced, folderId];
      setNavIndex(next.length - 1);
      return next;
    });
  }, [navIndex]);

  const navigateBack = () => {
    if (navIndex > 0) setNavIndex((idx) => idx - 1);
  };

  const navigateForward = () => {
    if (navIndex < navHistory.length - 1) setNavIndex((idx) => idx + 1);
  };

  const loadAllItems = useCallback(async () => {
    const db = await openDriveVaultDB();
    const tx = db.transaction("drive_items", "readonly");
    const req = tx.objectStore("drive_items").getAll();
    req.onsuccess = async () => {
      let existing = getStorageItemSummary(req.result, activeProfile);

      // Deduplicate legacy duplicate folders (e.g., duplicate "09. Training")
      const redundantIds = deduplicateRootFolders(existing);
      if (redundantIds.length > 0) {
        const cleanTx = db.transaction("drive_items", "readwrite");
        const cleanStore = cleanTx.objectStore("drive_items");
        redundantIds.forEach((id) => cleanStore.delete(id));
        existing = existing.filter((x) => !redundantIds.includes(x.id));
      }

      const rootFolders = existing.filter(
        (x) => (x.parentId === "ROOT" || x.originalParentId === "ROOT") && x.kind === "FOLDER"
      );

      const missingFolders = WINDOWS_11_DEFAULT_FOLDERS.filter((name) => !hasRootPrefixMatch(rootFolders, name));
      if (missingFolders.length > 0) {
        const writeTx = db.transaction("drive_items", "readwrite");
        const store = writeTx.objectStore("drive_items");
        const backupId = getDistrictStorageBackupFolderId(activeProfile);
        missingFolders.forEach((fName, idx) => {
          const isBackup = fName.toLowerCase() === "backup";
          store.put({
            id: isBackup ? backupId : `mod_fld_${idx}_${Date.now()}`,
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

  useEffect(() => {
    const timer = window.setInterval(() => setClockLabel(formatIstClockDate()), 15000);
    return () => window.clearInterval(timer);
  }, []);

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

  const activeWriteFolderId =
    explorerMode !== "CLOSED" && explorerMode !== "MINIMIZED" && currentFolderId !== RECYCLE_BIN_ID
      ? currentFolderId
      : "ROOT";

  const handleCreateFolder = async (overrideParentId) => {
    const folderName = prompt(english ? "Enter new folder name:" : "नए फोल्डर का नाम लिखें:");
    if (!folderName || !folderName.trim()) return;
    await saveItemToDB({
      id: "fld_" + Date.now(),
      parentId: overrideParentId || activeWriteFolderId,
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
        parentId: activeWriteFolderId,
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

  const handleCreateNewDoc = async (docType, overrideParentId) => {
    const rawName = prompt(docType === "EXCEL" ? "नई Excel फ़ाइल का नाम लिखें:" : "नई Word फ़ाइल का नाम लिखें:");
    if (!rawName || !rawName.trim()) return;

    const targetParent = overrideParentId || activeWriteFolderId;
    let createdItem;
    if (docType === "EXCEL") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet([{ "क्र.सं.": 1, "पद": "", "बेल्ट नं.": "", "नाम": "", "पदस्थापन": "" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const fName = rawName.endsWith(".xlsx") ? rawName : `${rawName.trim()}.xlsx`;
      createdItem = {
        id: "fil_" + Date.now(),
        parentId: targetParent,
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
        parentId: targetParent,
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
    openDesktopApp(docType === "EXCEL" ? "excel-pro" : "word-pro", createdItem);
  };

  const handleSaveOfficeFile = async (updatedItem) => {
    const byteLength = updatedItem?.data?.byteLength ?? updatedItem?.data?.length ?? 0;
    const nextItem = {
      ...updatedItem,
      sizeKB: byteLength ? (byteLength / 1024).toFixed(1) : updatedItem.sizeKB,
      updatedAt: new Date().toISOString()
    };
    await saveItemToDB(nextItem);
    setOpenWindows((prev) => prev.map((w) => (w.item?.id === nextItem.id ? { ...w, item: nextItem, title: nextItem.name } : w)));
    if (pdfModalItem?.id === nextItem.id) setPdfModalItem(nextItem);
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
      parentId: activeWriteFolderId,
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
      await saveItemToDB({ ...source, parentId: targetFolderId, updatedAt: new Date().toISOString() });
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
        originalParentId: entry.parentId,
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

  const desktopRootItems = useMemo(() => {
    const active = items.filter((i) => !i.isTrashed && i.parentId === "ROOT");
    return [...active].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const galleryPhotos = useMemo(
    () => items.filter((i) => !i.isTrashed && i.kind === "FILE" && getVaultFileAppKind(i.name, i.mime) === "PHOTO"),
    [items]
  );

  const mediaFiles = useMemo(
    () => items.filter((i) => !i.isTrashed && i.kind === "FILE" && getVaultFileAppKind(i.name, i.mime) === "MEDIA"),
    [items]
  );

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

  const explorerItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (currentFolderId === RECYCLE_BIN_ID) {
      const binList = q
        ? trashedTopItems.filter((i) => i.name.toLowerCase().includes(q))
        : trashedTopItems;
      return [...binList].sort((a, b) => String(b.trashedAt || "").localeCompare(String(a.trashedAt || "")));
    }

    const active = items.filter((i) => !i.isTrashed);
    const list = q
      ? active.filter((i) => i.name.toLowerCase().includes(q))
      : active.filter((i) => i.parentId === currentFolderId);

    return [...list].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, currentFolderId, search, trashedTopItems]);

  const inRecycleBin = currentFolderId === RECYCLE_BIN_ID;
  const inStrengthFolder = useMemo(() => isStrengthVaultFolder(breadcrumbs), [breadcrumbs]);
  const explorerVisible = explorerMode === "NORMAL" || explorerMode === "MAXIMIZED";

  const navigateUp = () => {
    if (search.trim()) {
      setSearch("");
      return;
    }
    if (inRecycleBin || breadcrumbs.length <= 1) {
      navigateExplorerTo("ROOT");
    } else {
      navigateExplorerTo(breadcrumbs[breadcrumbs.length - 2].id);
    }
  };

  const openVaultItem = (item, allowRecycle = false) => {
    if (renamingId === item.id) return;
    if (!allowRecycle && item.isTrashed) return;
    setSelectedId(item.id);
    if (item.kind === "FOLDER") {
      setSearch("");
      navigateExplorerTo(item.id);
      return;
    }
    const kind = getVaultFileAppKind(item.name, item.mime);
    if (kind === "EXCEL") return openDesktopApp("excel-pro", item);
    if (kind === "WORD") return openDesktopApp("word-pro", item);
    if (kind === "PHOTO") return openDesktopApp("photo-viewer", item);
    if (kind === "MEDIA") return openDesktopApp("media-player", item);
    if (kind === "CODE") return openDesktopApp("vscode-lite", item);
    if (kind === "PDF") return setPdfModalItem(item);
    handleDownload(item);
  };

  const openContextMenu = (e, type, item = null) => {
    e.preventDefault();
    e.stopPropagation();
    setStartMenuOpen(false);
    const clientX = e.clientX ?? e.currentTarget.getBoundingClientRect().left;
    const clientY = e.clientY ?? e.currentTarget.getBoundingClientRect().bottom;
    setContextMenu({ x: clientX, y: clientY, type, item });
  };

  const handleTaskbarSearchChange = (value) => {
    setSearch(value);
    if (value.trim() && !explorerVisible) {
      navigateExplorerTo("ROOT");
    }
  };

  const toggleExplorerTaskbar = () => {
    setExplorerMode(explorerVisible ? "MINIMIZED" : "NORMAL");
  };

  const activeFolderDestinations = useMemo(
    () => items.filter((i) => !i.isTrashed && i.kind === "FOLDER").sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const installedCatalog = useMemo(
    () => APP_STORE_CATALOG.filter((app) => installedApps.includes(app.id)),
    [installedApps]
  );

  const filteredStartApps = useMemo(() => {
    const q = startSearch.trim().toLowerCase();
    return q
      ? installedCatalog.filter((a) => a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q))
      : installedCatalog;
  }, [installedCatalog, startSearch]);

  const pinnedDesktopApps = useMemo(
    () => installedCatalog.filter((a) => pinnedApps.includes(a.id)),
    [installedCatalog, pinnedApps]
  );

  const explorerWindowTitle = inRecycleBin
    ? (english ? "Recycle Bin" : "Recycle Bin (रीसायकल बिन)")
    : breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1].name
      : `This PC — ${activeProfile} District Vault`;

  const wpClass = WALLPAPER_PRESETS.find((w) => w.id === wallpaper)?.className || "wp-bloom";

  return (
    <section className="win11-desktop-shell" aria-label="Windows 11 Web Desktop">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUploadFiles}
        className="win11-hidden-input"
      />

      {/* === 1. WINDOWS 11 DESKTOP STAGE === */}
      <div
        className={`win11-desktop-stage ${wpClass}`}
        onClick={() => {
          setSelectedId(null);
          setStartMenuOpen(false);
        }}
        onContextMenu={(e) => openContextMenu(e, "EMPTY")}
      >
        {/* Decorative Bloom Overlay */}
        <svg className="win11-bloom-svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="win11PetalA" cx="62%" cy="46%" r="48%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.48" />
              <stop offset="55%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#07193a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="win11PetalB" cx="48%" cy="54%" r="42%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
              <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#07193a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M560,120 C760,70 980,220 930,430 C880,620 620,660 470,540 C340,430 370,170 560,120 Z" fill="url(#win11PetalA)" />
          <path d="M460,180 C650,150 820,280 790,460 C760,610 530,620 420,490 C320,370 310,210 460,180 Z" fill="url(#win11PetalB)" />
        </svg>

        {/* Left-Aligned Top-to-Bottom Desktop Icons Grid */}
        <div className="win11-desktop-icons">
          {/* Pinned 1: 💻 This PC */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setSearch("");
              navigateExplorerTo("ROOT");
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setSearch("");
              navigateExplorerTo("ROOT");
            }}
            onContextMenu={(e) => openContextMenu(e, "THIS_PC")}
            className={`win11-desktop-tile${selectedId === "THIS_PC" ? " is-selected" : ""}`}
          >
            <span className="win11-tile-icon">💻</span>
            <span className="win11-tile-label">This PC ({activeProfile})</span>
          </div>

          {/* Pinned 2: 🗑️ Recycle Bin */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setSearch("");
              navigateExplorerTo(RECYCLE_BIN_ID);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setSearch("");
              navigateExplorerTo(RECYCLE_BIN_ID);
            }}
            onContextMenu={(e) => openContextMenu(e, "RECYCLE_BIN")}
            className={`win11-desktop-tile${selectedId === RECYCLE_BIN_ID ? " is-selected" : ""}`}
          >
            {trashedTopItems.length > 0 && (
              <span className="win11-tile-badge">{trashedTopItems.length}</span>
            )}
            <button
              type="button"
              aria-label="Recycle Bin options"
              onClick={(e) => openContextMenu(e, "RECYCLE_BIN")}
              className="win11-tile-menu-btn"
            >
              ⋮
            </button>
            <span className="win11-tile-icon">🗑️</span>
            <span className="win11-tile-label">Recycle Bin</span>
          </div>

          {/* Pinned Built-in Store Apps on Desktop */}
          {pinnedDesktopApps.map((app) => (
            <div
              key={`pin-${app.id}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                openDesktopApp(app.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openDesktopApp(app.id);
              }}
              className="win11-desktop-tile"
            >
              <span className="win11-tile-icon">{app.icon}</span>
              <span className="win11-tile-label">{app.title}</span>
            </div>
          ))}

          {/* Deduplicated District Folders & Root User Files */}
          {desktopRootItems.map((item) => {
            const isCut = clipboard?.mode === "CUT" && clipboard.itemId === item.id;
            const isRenaming = renamingId === item.id;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  openVaultItem(item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  openVaultItem(item);
                }}
                onContextMenu={(e) => openContextMenu(e, "ITEM", item)}
                className={`win11-desktop-tile${selectedId === item.id ? " is-selected" : ""}${isCut ? " is-cut" : ""}`}
              >
                <button
                  type="button"
                  aria-label="Item options"
                  onClick={(e) => openContextMenu(e, "ITEM", item)}
                  className="win11-tile-menu-btn"
                >
                  ⋮
                </button>
                <span className="win11-tile-icon">{getFileIcon(item)}</span>
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
                    className="win11-rename-input"
                  />
                ) : (
                  <span className="win11-tile-label">{item.name}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* === 2. WINDOWS 11 FILE EXPLORER WINDOW === */}
        {explorerVisible && (
          <div
            role="dialog"
            aria-label={explorerWindowTitle}
            onClick={(e) => e.stopPropagation()}
            className={`win11-explorer-window${explorerMode === "MAXIMIZED" ? " is-maximized" : ""}`}
          >
            <header className="win11-window-titlebar">
              <div className="win11-window-title-left">
                <span>{inRecycleBin ? "🗑️" : currentFolderId === "ROOT" ? "💻" : "📁"}</span>
                <h3 className="win11-window-title">{explorerWindowTitle}</h3>
              </div>

              <div className="win11-window-controls">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "GRID" ? "LIST" : "GRID")}
                  className="win11-cmd-btn"
                >
                  {viewMode === "GRID" ? "☰ List" : "⊞ Icons"}
                </button>
                <button
                  type="button"
                  aria-label="Minimize Explorer"
                  onClick={() => setExplorerMode("MINIMIZED")}
                  className="win11-win-ctrl-btn"
                >
                  —
                </button>
                <button
                  type="button"
                  aria-label="Maximize or Restore Explorer"
                  onClick={() => setExplorerMode(explorerMode === "MAXIMIZED" ? "NORMAL" : "MAXIMIZED")}
                  className="win11-win-ctrl-btn"
                >
                  {explorerMode === "MAXIMIZED" ? "❐" : "□"}
                </button>
                <button
                  type="button"
                  aria-label="Close Explorer"
                  onClick={() => {
                    setExplorerMode("CLOSED");
                    setSearch("");
                  }}
                  className="win11-win-ctrl-btn is-close"
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="win11-explorer-navrow">
              <div className="win11-nav-arrows">
                <button type="button" aria-label="Back" disabled={navIndex <= 0} onClick={navigateBack} className="win11-nav-icon-btn">
                  ⬅️
                </button>
                <button type="button" aria-label="Forward" disabled={navIndex >= navHistory.length - 1} onClick={navigateForward} className="win11-nav-icon-btn">
                  ➡️
                </button>
                <button type="button" aria-label="Up" disabled={currentFolderId === "ROOT" && !search.trim()} onClick={navigateUp} className="win11-nav-icon-btn">
                  ⬆️
                </button>
              </div>

              <div className="win11-address-bar">
                <button type="button" onClick={() => { setSearch(""); navigateExplorerTo("ROOT"); }} className="win11-crumb-btn">
                  💻 This PC
                </button>
                <span className="win11-crumb-sep">&gt;</span>
                <button type="button" onClick={() => { setSearch(""); navigateExplorerTo("ROOT"); }} className="win11-crumb-btn">
                  District Vault
                </button>
                {inRecycleBin && (
                  <>
                    <span className="win11-crumb-sep">&gt;</span>
                    <button type="button" onClick={() => { setSearch(""); navigateExplorerTo(RECYCLE_BIN_ID); }} className="win11-crumb-btn">
                      🗑️ Recycle Bin
                    </button>
                  </>
                )}
                {breadcrumbs.map((b) => (
                  <React.Fragment key={b.id}>
                    <span className="win11-crumb-sep">&gt;</span>
                    <button type="button" onClick={() => { setSearch(""); navigateExplorerTo(b.id); }} className="win11-crumb-btn">
                      {b.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={english ? "🔍 Search folder..." : "🔍 फ़ोल्डर में खोजें..."}
                className="win11-explorer-search"
              />
            </div>

            {inRecycleBin ? (
              <div className="win11-recycle-bar">
                <span className="win11-recycle-label">
                  🗑️ {english
                    ? `Recycle Bin (${trashedTopItems.length} items) — Right-click or ⋮ to Restore / Delete`
                    : `रीसायकल बिन (${trashedTopItems.length} आइटम) — Restore या स्थायी Delete हेतु राइट-क्लिक करें`}
                </span>
                <div className="win11-cmd-group">
                  <button type="button" disabled={!trashedTopItems.length} onClick={handleRestoreAllRecycleBin} className="win11-cmd-btn is-green">
                    ♻️ Restore All
                  </button>
                  <button type="button" disabled={!trashedTopItems.length} onClick={handleEmptyRecycleBin} className="win11-cmd-btn is-danger">
                    🧹 Empty Recycle Bin
                  </button>
                </div>
              </div>
            ) : (
              <div className="win11-command-bar">
                <div className="win11-cmd-group">
                  <button type="button" onClick={() => handleCreateFolder()} className="win11-cmd-btn is-primary">
                    📁 + New Folder
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="win11-cmd-btn is-green">
                    ⬆️ Upload Files
                  </button>
                  <button type="button" onClick={() => handleCreateNewDoc("EXCEL")} className="win11-cmd-btn">
                    📊 + New Excel
                  </button>
                  <button type="button" onClick={() => handleCreateNewDoc("WORD")} className="win11-cmd-btn">
                    📝 + New Word
                  </button>
                  {clipboard && (
                    <button type="button" onClick={() => handlePasteInto(currentFolderId)} className="win11-cmd-btn">
                      📥 Paste ({clipboard.name})
                    </button>
                  )}
                </div>

                {clipboard && (
                  <div className="win11-clipboard-pill">
                    <span>{clipboard.mode === "CUT" ? "✂️" : "📋"} {clipboard.name}</span>
                    <button type="button" onClick={() => setClipboard(null)} className="win11-clipboard-clear">✕</button>
                  </div>
                )}
              </div>
            )}

            {inStrengthFolder && !inRecycleBin && (
              <div className="win11-strength-bar">
                <span className="win11-strength-label">
                  🛡️ {english ? "01. Strength Master Data Controls" : "01. Strength मास्टर डेटा प्रबंधन"}
                </span>
                <div className="win11-cmd-group">
                  {hasData && (
                    <button type="button" onClick={onExportMasterFile} disabled={isExportingMaster} className="win11-cmd-btn is-primary">
                      {isExportingMaster ? "⏳ Exporting..." : "📥 Export Master File"}
                    </button>
                  )}
                  {fileName && hasUnsavedChanges && (
                    <button type="button" onClick={onSaveToExcel} className="win11-cmd-btn is-purple">
                      💾 Save Excel Changes
                    </button>
                  )}
                  <label className="win11-cmd-btn is-primary">
                    📊 Upload Master Excel File
                    <input type="file" accept=".xlsx,.xls" onChange={handleMasterExcelUpload} className="win11-hidden-input" />
                  </label>
                  <button type="button" onClick={handleSaveLivePortalBackup} className="win11-cmd-btn is-purple">
                    💾 Save Live Data Here
                  </button>
                  <label className="win11-cmd-btn is-purple">
                    🔄 Restore Backup (.json)
                    <input type="file" accept=".json,application/json" onChange={handleRestoreBackup} className="win11-hidden-input" />
                  </label>
                  {fileName && (
                    <button type="button" onClick={onRemoveDistrictData} className="win11-cmd-btn is-danger">
                      🗑️ Remove District Data
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              className="win11-explorer-body"
              onContextMenu={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_EMPTY" : "EMPTY_EXPLORER")}
            >
              {explorerItems.length === 0 ? (
                <div className="win11-empty-state">
                  <div className="win11-empty-icon">{inRecycleBin ? "🗑️" : "📂"}</div>
                  <div className="win11-empty-title">
                    {inRecycleBin
                      ? (english ? "Recycle Bin is empty" : "Recycle Bin खाली है")
                      : (english ? "This folder is empty" : "यह फ़ोल्डर खाली है")}
                  </div>
                  <small>
                    {inRecycleBin
                      ? (english ? "Deleted items appear here safely before permanent removal." : "हटाई गई फ़ाइलें स्थायी डिलीट से पहले यहाँ सुरक्षित रहती हैं।")
                      : (english ? "Right-click empty space to create Folder, Excel, Word, or Upload files." : "नया फ़ोल्डर, Excel, Word बनाने या फ़ाइल अपलोड करने हेतु राइट-क्लिक करें।")}
                  </small>
                </div>
              ) : viewMode === "GRID" ? (
                <div className="win11-explorer-grid">
                  {explorerItems.map((item) => {
                    const isFolder = item.kind === "FOLDER";
                    const isCut = clipboard?.mode === "CUT" && clipboard.itemId === item.id;
                    const isRenaming = renamingId === item.id;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openVaultItem(item)}
                        onDoubleClick={() => openVaultItem(item)}
                        onContextMenu={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                        className={`win11-explorer-card${isFolder ? " is-folder" : ""}${isCut ? " is-cut" : ""}`}
                      >
                        <button
                          type="button"
                          aria-label="Item options"
                          onClick={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                          className="win11-tile-menu-btn"
                        >
                          ⋮
                        </button>
                        <span className="win11-explorer-icon">{getFileIcon(item)}</span>
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
                            className="win11-rename-input"
                          />
                        ) : (
                          <div className="win11-explorer-name">{item.name}</div>
                        )}
                        <div className="win11-explorer-meta">
                          {inRecycleBin
                            ? `${item.originalPath || "This PC"} · ${dateOnly(item.trashedAt)}`
                            : isFolder
                              ? (english ? "File folder" : "फ़ोल्डर")
                              : `${item.sizeKB} KB · ${dateOnly(item.updatedAt)}`}
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
                        <th className="module-cell-left">{english ? "Name" : "नाम (Name)"}</th>
                        <th>{english ? "Type" : "प्रकार"}</th>
                        <th>{inRecycleBin ? (english ? "Original Location" : "मूल स्थान") : (english ? "Size" : "साइज़")}</th>
                        <th>{inRecycleBin ? (english ? "Deleted On" : "हटाने की तिथि") : (english ? "Modified" : "दिनांक")}</th>
                        <th>⋮</th>
                      </tr>
                    </thead>
                    <tbody>
                      {explorerItems.map((item) => {
                        const isFolder = item.kind === "FOLDER";
                        const isRenaming = renamingId === item.id;
                        return (
                          <tr
                            key={item.id}
                            onContextMenu={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                          >
                            <td
                              onClick={() => openVaultItem(item)}
                              className={`win11-list-name${isFolder ? " is-folder" : ""}`}
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
                                  className="win11-rename-input"
                                />
                              ) : (
                                <>
                                  {getFileIcon(item)} &nbsp; {item.name}
                                </>
                              )}
                            </td>
                            <td className="module-cell-center">{item.kind}</td>
                            <td className="module-cell-center module-cell-tnr">
                              {inRecycleBin ? (item.originalPath || "This PC") : isFolder ? "-" : `${item.sizeKB} KB`}
                            </td>
                            <td className="module-cell-center module-cell-tnr">
                              {dateOnly(inRecycleBin ? item.trashedAt : item.updatedAt)}
                            </td>
                            <td className="module-cell-center">
                              <button
                                type="button"
                                onClick={(e) => openContextMenu(e, inRecycleBin ? "RECYCLE_ITEM" : "ITEM", item)}
                                className="win11-cmd-btn"
                              >
                                ⋮
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === 3. DRAGGABLE WINDOWS 11 BUILT-IN APPS === */}
        {openWindows.map((win) => (
          <DesktopWindowFrame
            key={win.id}
            title={win.title}
            icon={win.icon}
            initialWidth={win.width || "wide"}
            minimized={win.minimized}
            onFocus={() => focusWindow(win.id)}
            onMinimize={() => setOpenWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, minimized: true } : w)))}
            onClose={() => setOpenWindows((prev) => prev.filter((w) => w.id !== win.id))}
          >
            {win.appId === "excel-pro" && (
              <ExcelApp key={win.item?.id || "new-xlsx"} item={win.item} onSaveFile={handleSaveOfficeFile} language={language} />
            )}
            {win.appId === "word-pro" && (
              <WordApp key={win.item?.id || "new-doc"} item={win.item} onSaveFile={handleSaveOfficeFile} language={language} />
            )}
            {win.appId === "photo-viewer" && (
              <PhotoViewerApp key={win.item?.id || "photo"} item={win.item} galleryItems={galleryPhotos} language={language} />
            )}
            {win.appId === "media-player" && (
              <MediaPlayerApp key={win.item?.id || "media"} item={win.item} mediaList={mediaFiles} language={language} />
            )}
            {win.appId === "vscode-lite" && (
              <CodeEditorApp key={win.item?.id || "code"} item={win.item} onSaveFile={handleSaveOfficeFile} language={language} />
            )}
            {win.appId === "calculator" && <CalculatorApp />}
            {win.appId === "sticky-notes" && <StickyNotesApp language={language} />}
            {win.appId === "games" && <GamesApp />}
            {win.appId === "app-store" && (
              <AppStoreApp
                installedApps={installedApps}
                pinnedApps={pinnedApps}
                onToggleInstall={toggleInstallApp}
                onTogglePin={togglePinApp}
                onLaunchApp={(appId) => openDesktopApp(appId)}
                language={language}
              />
            )}
          </DesktopWindowFrame>
        ))}

        {/* === WINDOWS 11 START MENU (Search + Pinned Apps + App Store) === */}
        {startMenuOpen && (
          <div className="win11-start-menu" role="menu" onClick={(e) => e.stopPropagation()}>
            <input
              type="search"
              value={startSearch}
              onChange={(e) => setStartSearch(e.target.value)}
              placeholder={english ? "🔍 Search apps & tools..." : "🔍 ऐप व टूल खोजें..."}
              className="win11-start-search"
            />

            <div className="win11-start-header">
              ⊞ {activeProfile} · {english ? "Installed & Pinned Apps" : "पिन किए गए व इंस्टॉल ऐप्स"}
            </div>

            <div className="win11-start-grid">
              <button type="button" onClick={() => { setStartMenuOpen(false); navigateExplorerTo("ROOT"); }} className="win11-start-tile">
                💻 This PC
              </button>
              <button type="button" onClick={() => { setStartMenuOpen(false); navigateExplorerTo(RECYCLE_BIN_ID); }} className="win11-start-tile">
                🗑️ Recycle Bin
              </button>
              {filteredStartApps.map((app) => (
                <button
                  key={`start-${app.id}`}
                  type="button"
                  onClick={() => openDesktopApp(app.id)}
                  className="win11-start-tile"
                >
                  {app.icon} {app.title}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openDesktopApp("app-store")}
              className="win11-start-store-btn"
            >
              🛍️ {english ? "App Store (Install / Pin Apps)" : "App Store (ऐप्स इंस्टॉल व पिन करें)"}
            </button>
          </div>
        )}
      </div>

      {/* === 4. BOTTOM GLASSMORPHIC WINDOWS 11 TASKBAR === */}
      <footer className="win11-taskbar" onClick={(e) => e.stopPropagation()}>
        <div className="win11-taskbar-left">
          <button
            type="button"
            onClick={() => setStartMenuOpen((prev) => !prev)}
            className={`win11-start-btn${startMenuOpen ? " is-active" : ""}`}
          >
            ⊞ Start
          </button>

          <input
            type="search"
            value={search}
            onChange={(e) => handleTaskbarSearchChange(e.target.value)}
            placeholder={english ? "🔍 Search Files & Folders..." : "🔍 फ़ाइल व फ़ोल्डर खोजें..."}
            aria-label="Search Files and Folders"
            className="win11-taskbar-search"
          />

          <div className="win11-taskbar-pins">
            <button
              type="button"
              onClick={toggleExplorerTaskbar}
              className={`win11-task-app-btn${explorerMode !== "CLOSED" ? " is-open" : ""}`}
            >
              📁 Explorer
            </button>
            <button type="button" onClick={() => openDesktopApp("app-store")} className="win11-task-app-btn">
              🛍️ Store
            </button>
            <button type="button" onClick={() => navigateExplorerTo(RECYCLE_BIN_ID)} className={`win11-task-app-btn${explorerVisible && inRecycleBin ? " is-open" : ""}`}>
              🗑️ Bin {trashedTopItems.length > 0 ? `(${trashedTopItems.length})` : ""}
            </button>

            {openWindows.map((win) => (
              <button
                key={`tb-${win.id}`}
                type="button"
                onClick={() => toggleTaskbarWindow(win.id)}
                className={`win11-task-app-btn${!win.minimized ? " is-open" : ""}`}
              >
                {win.icon} {win.title}
              </button>
            ))}
          </div>
        </div>

        <div className="win11-taskbar-tray">
          <span className="win11-sync-pill">
            🟢 {activeProfile} · {english ? "OneDrive Ready" : "सिंक सक्रिय"}
          </span>
          <span className="win11-clock">{clockLabel}</span>
        </div>
      </footer>

      {/* === WINDOWS 11 FROSTED CONTEXT MENU PORTAL === */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          role="menu"
          className="storage-context-menu"
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.type === "THIS_PC" && (
            <>
              <button type="button" role="menuitem" onClick={() => { setContextMenu(null); navigateExplorerTo("ROOT"); }} className="storage-context-item">
                📂 Open This PC
              </button>
              <button type="button" role="menuitem" onClick={() => { setContextMenu(null); loadAllItems(); }} className="storage-context-item">
                🔄 Refresh
              </button>
            </>
          )}

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
              {contextMenu.item.kind === "FILE" && getVaultFileAppKind(contextMenu.item.name, contextMenu.item.mime) === "EXCEL" && onLoadExcelBlob && (
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
              <button type="button" role="menuitem" onClick={() => startInlineRename(contextMenu.item)} className="storage-context-item">
                ✏️ Rename
              </button>
              <div className="storage-context-divider" />
              <button type="button" role="menuitem" onClick={() => handleCutItem(contextMenu.item)} className="storage-context-item">
                ✂️ Cut
              </button>
              <button type="button" role="menuitem" onClick={() => handleCopyItem(contextMenu.item)} className="storage-context-item">
                📋 Copy
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!clipboard}
                onClick={() => handlePasteInto(contextMenu.item.kind === "FOLDER" ? contextMenu.item.id : activeWriteFolderId)}
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
                ⬇️ Download
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMoveToRecycleBin(contextMenu.item)}
                className="storage-context-item is-danger"
              >
                🗑️ Delete (Move to Recycle Bin)
              </button>
            </>
          )}

          {(contextMenu.type === "EMPTY" || contextMenu.type === "EMPTY_EXPLORER") && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const dest = contextMenu.type === "EMPTY" ? "ROOT" : activeWriteFolderId;
                  setContextMenu(null);
                  handleCreateFolder(dest);
                }}
                className="storage-context-item"
              >
                📁 New Folder
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const dest = contextMenu.type === "EMPTY" ? "ROOT" : activeWriteFolderId;
                  setContextMenu(null);
                  handleCreateNewDoc("EXCEL", dest);
                }}
                className="storage-context-item"
              >
                📊 New Excel
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const dest = contextMenu.type === "EMPTY" ? "ROOT" : activeWriteFolderId;
                  setContextMenu(null);
                  handleCreateNewDoc("WORD", dest);
                }}
                className="storage-context-item"
              >
                📝 New Word
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
                onClick={() => handlePasteInto(contextMenu.type === "EMPTY" ? "ROOT" : activeWriteFolderId)}
                className="storage-context-item"
              >
                📥 Paste {clipboard ? `(${clipboard.name})` : ""}
              </button>
              <div className="storage-context-divider" />
              <div className="storage-context-item">🎨 Change Wallpaper</div>
              <div className="win11-wallpaper-pills">
                {WALLPAPER_PRESETS.map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => {
                      changeWallpaper(wp.id);
                      setContextMenu(null);
                    }}
                    className={`win11-wp-pill${wallpaper === wp.id ? " is-active" : ""}`}
                  >
                    {english ? wp.label : wp.hiLabel}
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  loadAllItems();
                }}
                className="storage-context-item"
              >
                🔄 Refresh
              </button>
            </>
          )}

          {contextMenu.type === "RECYCLE_ITEM" && contextMenu.item && (
            <>
              <button type="button" role="menuitem" onClick={() => handleRestoreItem(contextMenu.item)} className="storage-context-item">
                ♻️ Restore to Original Path
              </button>
              <button type="button" role="menuitem" onClick={() => handleDeletePermanently(contextMenu.item)} className="storage-context-item is-danger">
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
                    setSearch("");
                    navigateExplorerTo(RECYCLE_BIN_ID);
                  }}
                  className="storage-context-item"
                >
                  📂 Open Recycle Bin
                </button>
              )}
              <button type="button" role="menuitem" disabled={!trashedTopItems.length} onClick={handleRestoreAllRecycleBin} className="storage-context-item">
                ♻️ Restore All Items
              </button>
              <button type="button" role="menuitem" disabled={!trashedTopItems.length} onClick={handleEmptyRecycleBin} className="storage-context-item is-danger">
                🧹 Empty Recycle Bin
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Move to Folder Picker Modal */}
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
              📁 Move &ldquo;{moveTargetItem.name}&rdquo; to:
            </h4>
            <div className="storage-move-list">
              <button
                type="button"
                disabled={!canMoveItemToTarget(moveTargetItem, "ROOT", items)}
                onClick={() => handleMoveToTarget("ROOT")}
                className="storage-move-option"
              >
                💻 This PC (Desktop Root)
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
              <button type="button" onClick={() => setMoveTargetItem(null)} className="win11-cmd-btn">
                ✕ {english ? "Cancel" : "रद्द करें"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Fallback Modal */}
      {pdfModalItem && (
        <InbuiltOfficeEditor
          item={pdfModalItem}
          onSaveFile={handleSaveOfficeFile}
          onClose={() => setPdfModalItem(null)}
          language={language}
        />
      )}
    </section>
  );
}
