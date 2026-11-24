import { useState } from "react";
import { OFFICE_CO_PS_LIST, PS_CHOWKI_MAP } from "../data/officeUnits";
import { devToHindi } from "../utils/devlysConverter";
import { isDevlysText } from "./HindiText";

const POSTING_OPTIONS = [
  ...new Set([...OFFICE_CO_PS_LIST, ...Object.values(PS_CHOWKI_MAP).flat()])
];

const FIELD_GROUPS = [
  {
    title: "व्यक्तिगत विवरण",
    fields: [
      { key: "NAME", label: "Name", type: "legacy-text" },
      { key: "FATHER NAME", label: "Father Name", type: "legacy-text" },
      { key: "CADER", label: "Post / Cader", type: "cader" },
      { key: "BELT NO", label: "Belt No." },
      { key: "CATEGORY", label: "Category", type: "category" },
      { key: "EDUCATION", label: "Education" }
    ]
  },
  {
    title: "सेवा विवरण",
    fields: [
      { key: "POSTING", label: "Posting Place", type: "office" },
      { key: "POSTING DOB NO", label: "Posting DOB", type: "posting-date" },
      { key: "DATE OF BIRTH", label: "Date of Birth", type: "date" },
      { key: "DATE OF JOINING", label: "Date of Joining", type: "date" },
      { key: "MOBILE NO 1", label: "Mobile No.", type: "mobile" }
    ]
  }
];

const FIELD_ALIASES = {
  "BELT NO": ["BELT NO", "BELT NO.", "BELT_NO", "Belt No", "BELT"],
  CATEGORY: ["CATEGORY", "CAT", "CASTE", "GEN/OBC"],
  "MOBILE NO 1": ["MOBILE NO 1", "MOBILE NO", "MOBILE", "CONTACT"]
};

const CADER_OPTIONS = ["SP", "ASP", "DySP", "CI", "SI", "ASI", "HC", "FC (GD)", "FC (DR)", "FC (MT)"];

function firstPresentValue(employee, keys) {
  for (const key of keys) {
    if (employee?.[key]) return employee[key];
  }
  return "";
}

function fieldStorageKey(employee, fieldKey) {
  const aliases = FIELD_ALIASES[fieldKey];
  if (!aliases) return fieldKey;
  return aliases.find((key) => employee?.[key]) ||
    aliases.find((key) => Object.prototype.hasOwnProperty.call(employee || {}, key)) ||
    aliases[0];
}

function getStoredValue(employee, key) {
  if (FIELD_ALIASES[key]) return firstPresentValue(employee, FIELD_ALIASES[key]);
  return employee[key] ?? "";
}

function displayValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return isDevlysText(text) ? devToHindi(text) : text;
}

function dateInputValue(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && value > 1000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!local) return "";
  let year = Number(local[3]);
  if (year < 100) year += year > 40 ? 1900 : 2000;
  return `${year}-${String(Number(local[2])).padStart(2, "0")}-${String(Number(local[1])).padStart(2, "0")}`;
}

function formatPostingDate(value) {
  if (!value) return "";
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number" || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
    const serial = Number(value);
    date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  } else {
    const text = String(value).trim();
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return displayValue(value);
    date = parsed;
  }
  if (Number.isNaN(date.getTime())) return displayValue(value);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function createForm(employee) {
  const values = {};
  FIELD_GROUPS.forEach(({ fields }) => {
    fields.forEach(({ key, type }) => {
      const value = getStoredValue(employee, key);
      if (type === "date") values[key] = dateInputValue(value);
      else if (type === "posting-date") values[key] = formatPostingDate(value);
      else if (type === "legacy-text") values[key] = String(value ?? "");
      else if (type === "cader") values[key] = String(value ?? "");
      else if (type === "mobile") values[key] = ["-", "_"].includes(String(value).trim()) ? "-" : displayValue(value);
      else values[key] = displayValue(value);
    });
  });
  return values;
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border: "1px solid #CBD5E1",
  borderRadius: "6px",
  fontSize: "0.95rem"
};

export default function EmployeeEditModal({ employee, isNew = false, onSave, onClose }) {
  const [form, setForm] = useState(() => createForm(employee));
  const [saving, setSaving] = useState(false);

  if (!employee) return null;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const savedForm = { ...form };
      ["DATE OF BIRTH", "DATE OF JOINING"].forEach((key) => {
        const match = String(savedForm[key] || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) savedForm[key] = `${match[3]}-${match[2]}-${match[1]}`;
      });
      const updatedEmployee = { ...employee };
      Object.entries(savedForm).forEach(([key, value]) => {
        updatedEmployee[fieldStorageKey(employee, key)] = value;
      });
      const saved = await onSave({
        ...employee,
        ...updatedEmployee,
        _uid: employee._uid,
        _origName: employee.NAME,
        _origFatherName: employee["FATHER NAME"],
        _origDob: employee["DATE OF BIRTH"]
      }, employee);
      if (saved === false) return;
      onClose();
      window.setTimeout(() => window.alert(isNew
        ? "✔ नया कर्मचारी सफलतापूर्वक जोड़ा गया!"
        : "✔ कर्मचारी विवरण सफलतापूर्वक अपडेट हो गया!"), 0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <form onSubmit={save} style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "760px", maxHeight: "90vh", overflowY: "auto", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#0B1E3D", fontSize: "1.2rem" }}>{isNew ? "➕ नया कर्मचारी जोड़ें" : "✏️ कर्मचारी विवरण संपादित करें"}</h2>
            <div style={{ marginTop: "4px", color: "#475569", fontSize: "0.9rem" }}>{displayValue(getStoredValue(employee, "NAME"))}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="बंद करें" style={{ border: 0, background: "transparent", fontSize: "1.4rem", cursor: "pointer", color: "#475569" }}>✕</button>
        </div>

        {FIELD_GROUPS.map((group) => (
          <fieldset key={group.title} style={{ border: "1px solid #E2E8F0", borderRadius: "8px", margin: "0 0 14px", padding: "12px" }}>
            <legend style={{ padding: "0 6px", color: "#1D63DC", fontWeight: "bold" }}>{group.title}</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
              {group.fields.map(({ key, label, type }) => {
                const currentValue = form[key] ?? "";
                const options = type === "office" ? [...new Set([...POSTING_OPTIONS, String(currentValue).trim()].filter(Boolean))] : [];
                const fontFamily = type === "legacy-text"
                  ? (/[\u0900-\u097F]/.test(String(currentValue)) ? "inherit" : "'DevLys 010', 'Kruti Dev 010', sans-serif")
                  : "'Times New Roman', Times, serif";
                const textStyle = { ...inputStyle, marginTop: "5px", fontFamily, fontSize: type === "legacy-text" ? "1.15rem" : inputStyle.fontSize };
                return (
                  <label key={key} style={{ display: "block", color: "#334155", fontSize: "0.88rem", fontWeight: 600 }}>
                    {label}
                    {type === "office" ? (
                      <select value={currentValue} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} style={{ ...textStyle, background: "#fff" }}>
                        <option value="">कार्यालय / थाना चुनें</option>
                        {options.map((place) => <option key={place} value={place}>{displayValue(place)}</option>)}
                      </select>
                    ) : type === "cader" ? (
                      <select value={currentValue} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} style={{ ...textStyle, background: "#fff" }}>
                        {!currentValue && <option value="">पद चुनें</option>}
                        {[...new Set([...CADER_OPTIONS, String(currentValue).trim()].filter(Boolean))].map((cader) => <option key={cader} value={cader}>{cader}</option>)}
                      </select>
                    ) : type === "category" ? (
                      <select value={currentValue} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} style={{ ...textStyle, background: "#fff" }}>
                        {!currentValue && <option value="">श्रेणी चुनें</option>}
                        {[...new Set(["GEN", "OBC", "SC", "ST", "MBC", "EWS", String(currentValue).trim()].filter(Boolean))].map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                    ) : (
                      <input
                        type={type === "date" ? "date" : "text"}
                        required={isNew && key === "NAME"}
                        value={currentValue}
                        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        style={textStyle}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 16px", border: "1px solid #CBD5E1", borderRadius: "6px", background: "#fff", cursor: "pointer" }}>रद्द करें</button>
          <button type="submit" disabled={saving} style={{ padding: "9px 18px", border: 0, borderRadius: "6px", background: "#15803D", color: "#fff", fontWeight: "bold", cursor: saving ? "wait" : "pointer" }}>
            {saving ? "सेव हो रहा है..." : "✅ सेव करें"}
          </button>
        </div>
      </form>
    </div>
  );
}
