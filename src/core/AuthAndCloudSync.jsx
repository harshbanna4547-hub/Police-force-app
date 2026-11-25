import { useState } from "react";
import { createDistrictSelection, DISTRICT_OPTIONS } from "./districtAuth.js";
import "./AuthAndCloudSync.css";

/**
 * [COMPONENT] DistrictSwitcherModal — जिला चयन एवं बदलने हेतु मोडल संवाद
 */
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
      className="district-modal-backdrop"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="district-switch-title"
        onSubmit={applyTypedDistrict}
        className="district-modal-dialog"
      >
        <div>
          <h2 id="district-switch-title" className="district-modal-title">जिला बदलें</h2>
          <p className="district-modal-subtitle">सूची से चुनें या नया जिला नाम टाइप करें।</p>
        </div>
        <input
          autoFocus
          list="rajasthan-districts"
          value={districtName}
          onChange={handleChange}
          aria-label="जिला नाम"
          placeholder="जैसे Udaipur"
          maxLength={100}
          className="district-modal-input"
        />
        <datalist id="rajasthan-districts">
          {DISTRICT_OPTIONS.map((district) => (
            <option key={district.code} value={district.name} label={`${district.hindiName} (${district.name})`} />
          ))}
          {DISTRICT_OPTIONS.map((district) => (
            <option key={`${district.code}-hindi`} value={district.hindiName} label={`${district.hindiName} (${district.name})`} />
          ))}
        </datalist>
        <div className="district-modal-actions">
          <button type="button" onClick={onClose} className="district-modal-cancel">रद्द करें</button>
          <button type="submit" disabled={!districtName.trim()} className="district-modal-submit">जिला खोलें</button>
        </div>
      </form>
    </div>
  );
}
