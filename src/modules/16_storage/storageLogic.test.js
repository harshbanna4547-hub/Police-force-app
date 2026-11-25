import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCopySubtree,
  canMoveItemToTarget,
  collectDescendantIds,
  deduplicateRootFolders,
  evaluateSpreadsheetFormula,
  extractWordBodyHtml,
  formatIstClockDate,
  getOfficeEditorKind,
  getVaultFileAppKind,
  getVaultItemPath,
  isStrengthVaultFolder,
  OFFICE_FONT_OPTIONS,
  RECYCLE_BIN_ID,
  WINDOWS_11_DEFAULT_FOLDERS,
  wrapWordDocumentHtml
} from "./storageLogic.js";

test("isStrengthVaultFolder returns true only inside 01. Strength hierarchy", () => {
  assert.equal(isStrengthVaultFolder([]), false);
  assert.equal(isStrengthVaultFolder([{ name: "02. Transfer (स्थानांतरण एवं आदेश)" }]), false);
  assert.equal(isStrengthVaultFolder([{ name: "01. Strength (स्वीकृत एवं कार्यरत नफरी)" }]), true);
  assert.equal(
    isStrengthVaultFolder([
      { name: "01. Strength (स्वीकृत एवं कार्यरत नफरी)" },
      { name: "2026 Subfolder" }
    ]),
    true
  );
});

test("getOfficeEditorKind identifies Excel, Word, and PDF files accurately", () => {
  assert.equal(getOfficeEditorKind("Master.xlsx"), "EXCEL");
  assert.equal(getOfficeEditorKind("Data.csv"), "EXCEL");
  assert.equal(getOfficeEditorKind("Order.doc"), "WORD");
  assert.equal(getOfficeEditorKind("Circular.docx"), "WORD");
  assert.equal(getOfficeEditorKind("Gazette.pdf"), "PDF");
  assert.equal(getOfficeEditorKind("Photo.png"), null);
});

test("Word body extraction and wrapping preserves DevLys 010 & Kruti Dev 010 @font-face", () => {
  const html = wrapWordDocumentHtml("<p>कार्यालय आदेश</p>", "Order", "DevLys 010");
  assert.match(html, /DevLys 010/);
  assert.match(html, /Kruti Dev 010/);
  assert.match(html, /Tinos/);
  assert.match(html, /Carlito/);
  assert.equal(extractWordBodyHtml(new TextEncoder().encode(html).buffer), "<p>कार्यालय आदेश</p>");
});

test("OFFICE_FONT_OPTIONS includes all 7 pre-bundled office fonts with DevLys 010 & Times New Roman defaults", () => {
  const values = OFFICE_FONT_OPTIONS.map((f) => f.value);
  assert.deepEqual(values, [
    "DevLys 010",
    "Times New Roman",
    "Kruti Dev 010",
    "Noto Sans Devanagari",
    "Calibri",
    "Arial",
    "Georgia"
  ]);
});

test("Explorer path, descendant tree, move guard, and copy subtree behave cleanly", () => {
  const sampleItems = [
    { id: "f1", parentId: "ROOT", kind: "FOLDER", name: "01. Strength" },
    { id: "f2", parentId: "f1", kind: "FOLDER", name: "2026 Orders" },
    { id: "f3", parentId: "ROOT", kind: "FOLDER", name: "02. Transfer" },
    { id: "doc1", parentId: "f2", kind: "FILE", name: "Roster.xlsx", data: new Uint8Array([1, 2, 3]).buffer }
  ];

  assert.equal(getVaultItemPath(sampleItems[3], sampleItems), "This PC > District Vault > 01. Strength > 2026 Orders");
  assert.deepEqual(collectDescendantIds("f1", sampleItems).sort(), ["doc1", "f2"]);
  assert.equal(canMoveItemToTarget(sampleItems[0], "f2", sampleItems), false);
  assert.equal(canMoveItemToTarget(sampleItems[0], RECYCLE_BIN_ID, sampleItems), false);
  assert.equal(canMoveItemToTarget(sampleItems[1], "f3", sampleItems), true);

  const copied = buildCopySubtree(sampleItems[1], "f1", sampleItems);
  assert.equal(copied.length, 2);
  assert.equal(copied[0].name, "2026 Orders - Copy");
  assert.equal(copied[1].parentId, copied[0].id);
});

test("WINDOWS_11_DEFAULT_FOLDERS lists all 14 unique folders and IST clock formats HH:mm | DD-MM-YYYY", () => {
  assert.equal(WINDOWS_11_DEFAULT_FOLDERS.length, 14);
  assert.equal(WINDOWS_11_DEFAULT_FOLDERS[0], "01. Strength");
  assert.equal(WINDOWS_11_DEFAULT_FOLDERS[13], "Backup");
  const formatted = formatIstClockDate(new Date("2026-11-25T15:51:00.000Z"));
  assert.equal(formatted, "21:21 | 25-11-2026");
});

test("Excel formula evaluator computes =SUM, =AVERAGE, =COUNT and file app kinds resolve cleanly", () => {
  const grid = [
    ["10", "20", "30"],
    ["40", "", "100"]
  ];
  assert.equal(evaluateSpreadsheetFormula("=SUM(A1:C1)", grid), "60");
  assert.equal(evaluateSpreadsheetFormula("=AVERAGE(A1:B2)", grid), "23.33");
  assert.equal(evaluateSpreadsheetFormula("=COUNT(A1:C2)", grid), "5");
  assert.equal(getVaultFileAppKind("photo.jpg"), "PHOTO");
  assert.equal(getVaultFileAppKind("training.mp4"), "MEDIA");
  assert.equal(getVaultFileAppKind("config.json"), "CODE");

  const dupIds = deduplicateRootFolders([
    { id: "t1", parentId: "ROOT", kind: "FOLDER", name: "09. Training (प्रशिक्षण)" },
    { id: "t2", parentId: "ROOT", kind: "FOLDER", name: "10. Training" }
  ]);
  assert.deepEqual(dupIds, ["t1"]);
});
