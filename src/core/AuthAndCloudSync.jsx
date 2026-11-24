import { useState } from "react";
import { DISTRICT_OPTIONS } from "./districtAuth.js";

function createDistrictSelection(value) {
  const name = String(value || "").trim();
  const knownDistrict = DISTRICT_OPTIONS.find((district) =>
    district.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    || district.hindiName === name
  );
  if (knownDistrict) return { id: knownDistrict.code, name: knownDistrict.name };

  const id = name.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const unicodeId = Array.from(name)
    .map((character) => character.codePointAt(0).toString(16))
    .join("_")
    .slice(0, 100);
  return {
    id: id.slice(0, 100) || `DISTRICT_${unicodeId}`,
    name
  };
}

export function DistrictSwitcherModal({ currentDistrict, onClose, onSelect }) {
  const [districtName, setDistrictName] = useState(currentDistrict.name);

  const handleChange = (event) => {
    const value = event.target.value;
    setDistrictName(value);
    const knownDistrict = DISTRICT_OPTIONS.find((district) =>
      district.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()
      || district.hindiName === value.trim()
    );
    if (knownDistrict) onSelect({ id: knownDistrict.code, name: knownDistrict.name });
  };

  const applyTypedDistrict = (event) => {
    event.preventDefault();
    const selection = createDistrictSelection(districtName);
    if (selection.id) onSelect(selection);
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "center", padding: "20px", background: "rgba(15,23,42,0.5)" }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="district-switch-title"
        onSubmit={applyTypedDistrict}
        style={{ width: "min(100%, 380px)", display: "grid", gap: "14px", padding: "22px", borderRadius: "14px", background: "#fff", boxShadow: "0 18px 48px rgba(15,23,42,0.24)" }}
      >
        <div>
          <h2 id="district-switch-title" style={{ margin: 0, color: "#0B1E3D", fontSize: "1.1rem" }}>जिला बदलें</h2>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: "0.88rem" }}>सूची से चुनें या नया जिला नाम टाइप करें।</p>
        </div>
        <input
          autoFocus
          list="rajasthan-districts"
          value={districtName}
          onChange={handleChange}
          aria-label="जिला नाम"
          placeholder="जैसे Udaipur"
          maxLength={100}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "1rem" }}
        />
        <datalist id="rajasthan-districts">
          {DISTRICT_OPTIONS.map((district) => (
            <option key={district.code} value={district.name} label={`${district.hindiName} (${district.name})`} />
          ))}
          {DISTRICT_OPTIONS.map((district) => (
            <option key={`${district.code}-hindi`} value={district.hindiName} label={`${district.hindiName} (${district.name})`} />
          ))}
        </datalist>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 13px", border: "1px solid #CBD5E1", borderRadius: "8px", background: "#fff", color: "#334155", cursor: "pointer" }}>रद्द करें</button>
          <button type="submit" disabled={!districtName.trim()} style={{ padding: "9px 13px", border: "none", borderRadius: "8px", background: "#1D63DC", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>जिला खोलें</button>
        </div>
      </form>
    </div>
  );
}
