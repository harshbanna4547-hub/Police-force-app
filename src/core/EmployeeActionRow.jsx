import React, { useState } from "react";
import { createPortal } from "react-dom";

const ACTIONS = [
  { id: "UPDATE", label: "✏️ Update Details" },
  { id: "TRANSFER", label: "🔄 Transfer / Posting" },
  { id: "RELIEVE", label: "🚪 Relieve / Retire / Death" },
  { id: "SERVICE_SLIP", label: "📄 View Service Slip" }
];

const RESPONSIVE_DETAIL_FIELDS = [
  ["Posting Place", "POSTING"],
  ["Posting DOB", "POSTING DOB NO"],
  ["Without DOB", "WITHOUT DOB"],
  ["Education", "EDUCATION"],
  ["Date of Birth", "DATE OF BIRTH"],
  ["DOJ", "DATE OF JOINING"],
  ["DOC", "DOC"]
];

export default function EmployeeActionRow({
  employee,
  onAction,
  children,
  style,
  responsiveDetails = false,
  nameCellIndex = 1
}) {
  const [menu, setMenu] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const mobileNo = employee?.["MOBILE NO 1"] || employee?.["MOBILE NO"] || employee?.MOBILE || employee?.CONTACT || "";
  const phoneNumber = String(mobileNo).replace(/[^\d+]/g, "");
  const rowCells = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child, index) => {
      if (!responsiveDetails || index !== nameCellIndex) return child;
      return React.cloneElement(child, {
        children: (
          <button
            type="button"
            className="employee-name-trigger"
            aria-expanded={detailsOpen}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setDetailsOpen((open) => !open);
            }}
          >
            {child.props.children}
          </button>
        )
      });
    });
  const openMenu = (event) => {
    if (responsiveDetails && window.innerWidth <= 1024) return;
    event.preventDefault();
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 250),
      y: Math.min(event.clientY, window.innerHeight - 190)
    });
  };

  return (
    <>
      <tr
        onClick={openMenu}
        onContextMenu={openMenu}
        style={{ ...style, cursor: responsiveDetails && window.innerWidth <= 1024 ? "default" : "context-menu" }}
        title="कर्मचारी कार्यवाही के लिए क्लिक या राइट-क्लिक करें"
      >
        {rowCells}
      </tr>
      {responsiveDetails && detailsOpen && (
        <tr className="employee-detail-row">
          <td colSpan={13} style={{ padding: 0, border: "1px solid #CBD5E1", background: "#F8FAFC" }}>
            <div className="employee-detail-card">
              {RESPONSIVE_DETAIL_FIELDS.map(([label, key]) => (
                <div key={key}>
                  <strong>{label}</strong>
                  <div>{employee?.[key] || "-"}</div>
                </div>
              ))}
              <div>
                <strong>Mobile Number</strong>
                <div>{mobileNo || "-"}</div>
              </div>
              <div className="employee-detail-actions">
                {phoneNumber && <a href={`tel:${phoneNumber}`}>📞 Call</a>}
                <button type="button" onClick={() => onAction?.("UPDATE", employee)}>✏️ Update</button>
              </div>
            </div>
          </td>
        </tr>
      )}
      {menu && createPortal(
        <div
          role="menu"
          onMouseLeave={() => setMenu(null)}
          onContextMenu={(event) => event.stopPropagation()}
          style={{ position: "fixed", left: menu.x, top: menu.y, zIndex: 1500, minWidth: "230px", padding: "6px", border: "1px solid #CBD5E1", borderRadius: "10px", background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,0.22)" }}
        >
          {ACTIONS.map((action) => (
            <button
              type="button"
              role="menuitem"
              key={action.id}
              onClick={() => {
                setMenu(null);
                onAction?.(action.id, employee);
              }}
              style={{ display: "block", width: "100%", padding: "9px 10px", border: 0, borderRadius: "6px", background: "#fff", color: "#0F172A", textAlign: "left", cursor: "pointer" }}
            >
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
