import XLSX from "xlsx-js-style";

const DATE_COLUMNS = new Set([
  "POSTING DOB NO",
  "DATE OF BIRTH",
  "DATE OF JOINING",
  "DATE OF CONFIRMATION",
  "CONFIRMATION DATE",
]);

const REQUIRED_SHEET_ORDER = [
  "Master_All_Data",
  "Posting_History",
  "PL_Leave_Account",
  "Saja_Record",
  "Training_History",
  "Attachment",
  "Deputation",
];

const HINDI_COLUMNS = new Set([
  "NAME",
  "FATHER NAME",
  "POSTING",
  "VILLAGE",
  "BLOCK",
  "CIRCLE",
  "POLICE STATION",
  "DISTRICT",
  "POSTING PLACE",
  "REMARK",
]);

const FIXED_COLUMN_WIDTHS = new Map([
  ["NAME", 22],
  ["FATHER NAME", 22],
  ["POSTING", 32],
  ["POSTING DOB NO", 14],
  ["DATE OF BIRTH", 14],
  ["DATE OF JOINING", 14],
  ["DATE OF CONFIRMATION", 14],
  ["CONFIRMATION DATE", 14],
  ["EDUCATION", 15],
  ["MOBILE NO", 15],
  ["SSOID", 18],
]);

const EMPTY_TECHNICAL_COLUMN = /^__EMPTY(?:_|$)/i;
const STORAGE_DB = "PoliceOneDriveVaultDB";
const STORAGE_STORE = "drive_items";
const STRENGTH_FOLDER = "01. Strength (स्वीकृत एवं कार्यरत नफरी)";
const MASTER_FOLDER = "Master File";

function isTechnicalColumn(key) {
  return key === "_uid" || EMPTY_TECHNICAL_COLUMN.test(key);
}

function excelSerialToDate(serial, date1904 = false) {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(serial * 86400000));
}

function formatDateValue(value, date1904 = false) {
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    date = excelSerialToDate(value, date1904);
  } else if (typeof value === "string") {
    const text = value.trim();
    const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      return `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date || Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${date.getFullYear()}`;
}

function normalizeCellValue(value, key, date1904) {
  const normalizedKey = String(key || "").trim().toUpperCase();
  if (DATE_COLUMNS.has(normalizedKey) || /DATE|DOB/.test(normalizedKey)) {
    return formatDateValue(value, date1904);
  }
  if (value instanceof Date) return formatDateValue(value, date1904);
  return value == null ? "" : value;
}

function cleanRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => row && typeof row === "object" && !Array.isArray(row),
  );
}

function encodeCell(row, column) {
  return XLSX.utils.encode_cell({ r: row, c: column });
}

function maxColumnFromHeaders(headers) {
  return headers.reduce(
    (max, header) => Math.max(max, header.column),
    -1,
  );
}

function getHeaderKey(worksheet, row, column) {
  const cell = worksheet[encodeCell(row, column)];
  return String(cell?.v ?? "").trim();
}

function writeCell(worksheet, row, column, value, key, date1904) {
  const address = encodeCell(row, column);
  const previous = worksheet[address] || {};
  const normalizedValue = normalizeCellValue(value, key, date1904);
  const cell = { ...previous, v: normalizedValue };
  delete cell.f;
  delete cell.w;
  if (typeof normalizedValue === "number") {
    cell.t = "n";
  } else if (typeof normalizedValue === "boolean") {
    cell.t = "b";
  } else {
    cell.t = "s";
  }
  worksheet[address] = cell;
}

function removeTechnicalColumns(worksheet, metadata) {
  const removedColumns = [...new Set(metadata.technicalColumns || [])]
    .filter(Number.isInteger)
    .sort((left, right) => left - right);
  if (!removedColumns.length) return metadata;

  const cells = [];
  for (const address of Object.keys(worksheet)) {
    if (address.startsWith("!")) continue;
    const position = XLSX.utils.decode_cell(address);
    if (!removedColumns.includes(position.c)) {
      const shift = removedColumns.filter((column) => column < position.c).length;
      cells.push({
        row: position.r,
        column: position.c - shift,
        cell: worksheet[address],
      });
    }
    delete worksheet[address];
  }
  cells.forEach(({ row, column, cell }) => {
    worksheet[encodeCell(row, column)] = cell;
  });

  const shiftColumn = (column) =>
    column - removedColumns.filter((removed) => removed < column).length;
  const lastColumn =
    Number.isInteger(metadata.lastColumn) && metadata.lastColumn >= 0
      ? metadata.lastColumn -
        removedColumns.filter((removed) => removed <= metadata.lastColumn).length
      : metadata.lastColumn;
  worksheet["!cols"] = (worksheet["!cols"] || []).filter(
    (_, column) => !removedColumns.includes(column),
  );
  worksheet["!merges"] = (worksheet["!merges"] || []).map((merge) => {
    const startShift = removedColumns.filter((column) => column <= merge.s.c).length;
    const endShift = removedColumns.filter((column) => column <= merge.e.c).length;
    return {
      s: { ...merge.s, c: Math.max(0, merge.s.c - startShift) },
      e: { ...merge.e, c: Math.max(0, merge.e.c - endShift) },
    };
  });

  return {
    ...metadata,
    headerColumns: (metadata.headerColumns || []).map(({ key, column }) => ({
      key,
      column: shiftColumn(column),
    })),
    technicalColumns: [],
    lastColumn,
  };
}

function updateWorksheet(worksheet, metadata, sourceRows, date1904) {
  metadata = removeTechnicalColumns(worksheet, metadata);
  const rows = cleanRows(sourceRows);
  const headerRow = Number.isInteger(metadata.headerRow) ? metadata.headerRow : 0;
  const headerColumns = [...(metadata.headerColumns || [])].filter(
    ({ key }) => !isTechnicalColumn(String(key)),
  );
  const columnsByKey = new Map(
    headerColumns.map(({ key, column }) => [String(key), column]),
  );
  let nextColumn = Math.max(
    Number.isInteger(metadata.lastColumn) ? metadata.lastColumn : 0,
    maxColumnFromHeaders(headerColumns),
  ) + 1;

  for (const row of rows) {
    for (const rawKey of Object.keys(row)) {
      const key = String(rawKey);
      if (isTechnicalColumn(key) || columnsByKey.has(key)) continue;
      columnsByKey.set(key, nextColumn);
      headerColumns.push({ key, column: nextColumn });
      writeCell(worksheet, headerRow, nextColumn, key, key, date1904);
      nextColumn += 1;
    }
  }

  for (const { key, column } of headerColumns) {
    writeCell(worksheet, headerRow, column, key, key, date1904);
  }

  const uidToRow = metadata.uidToRow || {};
  const rowsByUid = new Map();
  for (const row of rows) {
    if (row._uid) rowsByUid.set(String(row._uid), row);
  }

  let lastRow = Math.max(
    headerRow,
    Number.isInteger(metadata.lastRow) ? metadata.lastRow : headerRow,
  );
  for (const [uid, rowIndex] of Object.entries(uidToRow)) {
    if (!Number.isInteger(rowIndex) || rowIndex <= headerRow) continue;
    const current = rowsByUid.get(uid);
    for (const { key, column } of headerColumns) {
      writeCell(
        worksheet,
        rowIndex,
        column,
        current && Object.prototype.hasOwnProperty.call(current, key)
          ? current[key]
          : "",
        key,
        date1904,
      );
    }
    lastRow = Math.max(lastRow, rowIndex);
  }

  const newRows = rows.filter(
    (row) => !row._uid || !Object.prototype.hasOwnProperty.call(uidToRow, String(row._uid)),
  );
  for (const row of newRows) {
    lastRow += 1;
    for (const { key, column } of headerColumns) {
      writeCell(
        worksheet,
        lastRow,
        column,
        Object.prototype.hasOwnProperty.call(row, key) ? row[key] : "",
        key,
        date1904,
      );
    }
  }

  for (const column of metadata.technicalColumns || []) {
    for (let row = 0; row <= lastRow; row += 1) {
      delete worksheet[encodeCell(row, column)];
    }
  }

  let lastColumn = maxColumnFromHeaders(headerColumns);
  if (worksheet["!ref"]) {
    const oldRange = XLSX.utils.decode_range(worksheet["!ref"]);
    lastColumn = Math.max(lastColumn, oldRange.e.c);
    lastRow = Math.max(lastRow, oldRange.e.r);
  }
  worksheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(headerRow, lastRow), c: Math.max(0, lastColumn) },
  });

  return {
    ...metadata,
    headerRow,
    headerColumns,
    lastRow,
    lastColumn,
  };
}

function border(color) {
  const side = { style: "thin", color: { rgb: color } };
  return { top: side, bottom: side, left: side, right: side };
}

function containsDevanagari(value) {
  return /[\u0900-\u097F]/.test(String(value ?? ""));
}

function applyFormatting(worksheet, metadata, date1904) {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerRow = metadata.headerRow ?? range.s.r;
  const headerKeys = new Map(
    metadata.headerColumns.map(({ key, column }) => [
      column,
      String(key).trim().toUpperCase(),
    ]),
  );
  const widths = [];

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const key = headerKeys.get(column) || getHeaderKey(worksheet, headerRow, column).toUpperCase();
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const address = encodeCell(row, column);
      const cell = worksheet[address];
      if (cell) {
        const cleaned = normalizeCellValue(cell.v, key, date1904);
        if (cleaned !== cell.v) {
          cell.v = cleaned;
          cell.t = "s";
          delete cell.w;
        }
      }

      const isHeader = row === headerRow;
      const isHindi = HINDI_COLUMNS.has(key);
      const isZebraRow = row > headerRow && (row - headerRow) % 2 === 1;
      const existing = worksheet[address] || { t: "s", v: "" };
      existing.s = isHeader
        ? {
            font: { name: "Times New Roman", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
            fill: { patternType: "solid", fgColor: { rgb: "4472C4" } },
            border: border("000000"),
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
          }
        : {
            font: {
              name: isHindi
                ? (containsDevanagari(existing.v) ? "Mangal" : "DevLys 010")
                : "Times New Roman",
              sz: isHindi ? 14 : 11,
            },
            fill: {
              patternType: "solid",
              fgColor: { rgb: isZebraRow ? "D9E1F2" : "FFFFFF" },
            },
            border: border("8EA9DB"),
            alignment: {
              ...(isHindi ? {} : { horizontal: "center" }),
              vertical: "center",
              wrapText: true,
            },
          };
      worksheet[address] = existing;
    }

    widths[column] = { wch: FIXED_COLUMN_WIDTHS.get(key) || 14 };
  }

  worksheet["!cols"] = widths;
}

function worksheetFromRows(rows, date1904) {
  const keys = [];
  const seen = new Set();
  for (const row of cleanRows(rows)) {
    for (const rawKey of Object.keys(row)) {
      const key = String(rawKey);
      if (isTechnicalColumn(key) || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }

  const worksheet = {};
  for (let column = 0; column < keys.length; column += 1) {
    writeCell(worksheet, 0, column, keys[column], keys[column], date1904);
  }
  const metadata = {
    headerRow: 0,
    headerColumns: keys.map((key, column) => ({ key, column })),
    technicalColumns: [],
    uidToRow: {},
    lastRow: 0,
    lastColumn: Math.max(0, keys.length - 1),
  };
  return {
    worksheet,
    metadata: updateWorksheet(worksheet, metadata, rows, date1904),
  };
}

function getWorkbookData(records, allSheets) {
  const sheets = {};
  if (allSheets && typeof allSheets === "object") {
    for (const [name, rows] of Object.entries(allSheets)) {
      if (Array.isArray(rows)) sheets[name] = rows;
    }
  }
  if (!Object.keys(sheets).length) sheets.Master_All_Data = records || [];
  else if (Array.isArray(records) && sheets.Master_All_Data) {
    sheets.Master_All_Data = records;
  }
  return sheets;
}

function createWorkbook(originalWorkbook, records, allSheets) {
  const data = getWorkbookData(records, allSheets);
  const mainSheetName = originalWorkbook?.mainSheetName;
  if (mainSheetName && Array.isArray(data[mainSheetName])) {
    data[mainSheetName] = records;
  }
  if (!Array.isArray(data.Master_All_Data)) data.Master_All_Data = records || [];
  else if (Array.isArray(records)) data.Master_All_Data = records;

  for (const sheetName of REQUIRED_SHEET_ORDER) {
    if (!Array.isArray(data[sheetName])) data[sheetName] = [];
  }

  const workbook = originalWorkbook?.buffer
    ? XLSX.read(originalWorkbook.buffer, { type: "array", cellStyles: true, cellDates: true })
    : XLSX.utils.book_new();
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  const originalMetadata = originalWorkbook?.sheets || {};

  for (const [requestedName, rows] of Object.entries(data)) {
    const sheetName =
      workbook.SheetNames.find((name) => name === requestedName) ||
      requestedName.slice(0, 31);
    let worksheet = workbook.Sheets[sheetName];
    let metadata = originalMetadata[sheetName];

    if (!worksheet) {
      const created = worksheetFromRows(rows, date1904);
      worksheet = created.worksheet;
      metadata = created.metadata;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    } else if (!metadata) {
      const created = worksheetFromRows(rows, date1904);
      worksheet = created.worksheet;
      metadata = created.metadata;
      workbook.Sheets[sheetName] = worksheet;
    } else {
      metadata = updateWorksheet(worksheet, metadata, rows, date1904);
    }

    applyFormatting(worksheet, metadata, date1904);
  }

  const orderedSheetNames = [
    ...REQUIRED_SHEET_ORDER,
    ...Object.keys(data).filter((name) => !REQUIRED_SHEET_ORDER.includes(name)),
  ];
  for (const name of workbook.SheetNames) {
    if (!orderedSheetNames.includes(name)) delete workbook.Sheets[name];
  }
  workbook.SheetNames = orderedSheetNames;

  return workbook;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORAGE_DB);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORAGE_STORE)) {
        db.createObjectStore(STORAGE_STORE, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error || new Error("Storage Vault database open failed"));
    request.onsuccess = () => resolve(request.result);
  });
}

function transact(db, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORAGE_STORE, mode);
    const store = transaction.objectStore(STORAGE_STORE);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error("Storage Vault transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("Storage Vault transaction aborted"));
    try {
      const request = action(store);
      if (request && typeof request === "object" && "onsuccess" in request) {
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error || new Error("Storage Vault request failed"));
      } else {
        result = request;
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function saveToMasterFolder(fileName, arrayBuffer, activeProfile) {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable; the Master File could not be saved to Storage Vault.");
  }
  const db = await openDatabase();
  try {
    const items = await transact(db, "readonly", (store) => store.getAll());
    const rootId = "ROOT";
    let strength = items.find(
      (item) =>
        item.name === STRENGTH_FOLDER &&
        item.parentId === rootId &&
        item.kind === "FOLDER",
    );
    if (!strength) {
      strength = {
        id: `folder_strength_${Date.now()}`,
        name: STRENGTH_FOLDER,
        kind: "FOLDER",
        parentId: rootId,
      };
      await transact(db, "readwrite", (store) => store.put(strength));
    }

    let master = items.find(
      (item) =>
        item.name === MASTER_FOLDER &&
        item.parentId === strength.id &&
        item.kind === "FOLDER",
    );
    if (!master) {
      master = {
        id: `folder_master_${Date.now()}`,
        name: MASTER_FOLDER,
        kind: "FOLDER",
        parentId: strength.id,
      };
      await transact(db, "readwrite", (store) => store.put(master));
    }

    const file = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: fileName,
      kind: "FILE",
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeKB: (arrayBuffer.byteLength / 1024).toFixed(1),
      parentId: master.id,
      data: arrayBuffer,
      district: activeProfile,
      updatedAt: new Date().toLocaleString("en-IN"),
    };
    await transact(db, "readwrite", (store) => store.put(file));
  } finally {
    db.close();
  }
}

function makeExportName(originalFileName) {
  const sourceName = originalFileName || "Master File.xlsx";
  const stem = sourceName.replace(/\.xlsx$/i, "");
  const now = new Date();
  const date = `${String(now.getDate()).padStart(2, "0")}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  return `${stem}_${date}_${time}.xlsx`;
}

export async function exportMasterFile({
  records,
  allSheets,
  originalWorkbook,
  uploadedFileName,
  activeProfile,
}) {
  const workbook = createWorkbook(originalWorkbook, records, allSheets);
  const output = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  });
  const arrayBuffer = output instanceof ArrayBuffer ? output : output.buffer;
  const fileName = makeExportName(uploadedFileName);

  await saveToMasterFolder(fileName, arrayBuffer, activeProfile);

  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);

  window.alert(
    "✔ मास्टर फ़ाइल डाउनलोड हो गई है और Storage Vault > 01. Strength > Master File फोल्डर में भी सुरक्षित सेव कर दी गई है!",
  );
}

export default exportMasterFile;
