import { useState } from "react";

const ACTIONS = [
  { id: "UPDATE", label: "✏️ Update Details" },
  { id: "TRANSFER", label: "🔄 Transfer / Posting" },
  { id: "RELIEVE", label: "🚪 Relieve / Retire / Death" },
  { id: "SERVICE_SLIP", label: "📄 View Service Slip" }
];

export default function EmployeeActionRow({ employee, onAction, children, style }) {
  const [menu, setMenu] = useState(null);
  const openMenu = (event) => {
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
        style={{ ...style, cursor: "context-menu" }}
        title="कर्मचारी कार्यवाही के लिए क्लिक या राइट-क्लिक करें"
      >
        {children}
      </tr>
      {menu && (
        <div
          role="menu"
          onMouseLeave={() => setMenu(null)}
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
        </div>
      )}
    </>
  );
}
