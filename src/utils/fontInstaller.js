// src/utils/fontInstaller.js

const FONT_DB = "PoliceInbuiltFontsDB";
const FONT_STORE = "installed_fonts";

function openFontDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FONT_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: "fontName" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ब्राउज़र के CSS में फ़ॉन्ट इंजेक्ट करना
export async function injectFontFace(fontName, arrayBuffer) {
  const fontFace = new FontFace(fontName, arrayBuffer);
  const loaded = await fontFace.load();
  document.fonts.add(loaded);
}

// ऐप खुलते ही सभी इंस्टॉल किए गए फ़ॉन्ट्स को अपने आप लोड करना
export async function loadAllInstalledFonts() {
  try {
    const db = await openFontDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FONT_STORE, "readonly");
      const req = tx.objectStore(FONT_STORE).getAll();
      req.onsuccess = async () => {
        const list = req.result || [];
        for (const f of list) {
          await injectFontFace(f.fontName, f.buffer);
        }
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// नया फ़ॉन्ट (.ttf / .otf) ऐप में स्थायी रूप से इंस्टॉल करना
export async function installFontInApp(fontName, file) {
  const buffer = await file.arrayBuffer();
  await injectFontFace(fontName, buffer);

  const db = await openFontDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, "readwrite");
    tx.objectStore(FONT_STORE).put({
      fontName,
      fileName: file.name,
      installedAt: new Date().toLocaleString("en-IN"),
      buffer
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// इंस्टॉल फ़ॉन्ट हटाना
export async function removeInstalledFont(fontName) {
  const db = await openFontDB();
  return new Promise((resolve) => {
    const tx = db.transaction(FONT_STORE, "readwrite");
    tx.objectStore(FONT_STORE).delete(fontName);
    tx.oncomplete = () => resolve(true);
  });
}
