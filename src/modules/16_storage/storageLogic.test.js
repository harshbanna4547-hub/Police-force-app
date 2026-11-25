import test from "node:test";
import assert from "node:assert/strict";
import {
  extractWordBodyHtml,
  getOfficeEditorKind,
  isStrengthVaultFolder,
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

test("Word body extraction and wrapping preserves DevLys 010 @font-face", () => {
  const html = wrapWordDocumentHtml("<p>कार्यालय आदेश</p>", "Order", "DevLys 010");
  assert.match(html, /DevLys 010/);
  assert.equal(extractWordBodyHtml(new TextEncoder().encode(html).buffer), "<p>कार्यालय आदेश</p>");
});
