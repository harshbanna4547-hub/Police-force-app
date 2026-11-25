import React, { useState } from "react";
import { createPortal } from "react-dom";
import HindiText from "../../core/HindiText";
import {
  displayDetailValue,
  EMPLOYEE_ACTIONS,
  EMPLOYEE_DETAIL_FIELDS,
  getCallablePhone,
  getEmployeePhone
} from "./EmployeeActionMenu.logic";
import "./EmployeeActionMenu.css";

export default function EmployeeActionMenu({
  employee,
  onAction,
  children,
  style,
  responsiveDetails = false,
  nameCellIndex = 1
}) {
  const [menu, setMenu] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const mobileNo = getEmployeePhone(employee);
  const phoneNumber = getCallablePhone(mobileNo);
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
              if (window.innerWidth > 1024) return;
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
          <td colSpan={13} className="employee-detail-cell">
            <div className="employee-detail-card">
              {EMPLOYEE_DETAIL_FIELDS.map(([label, key]) => (
                <div key={key}>
                  <strong>{label}</strong>
                  <div>
                    {key === "POSTING"
                      ? <HindiText text={displayDetailValue(employee?.[key])} />
                      : displayDetailValue(employee?.[key])}
                  </div>
                </div>
              ))}
              <div>
                <strong>Mobile Number</strong>
                <div>{displayDetailValue(mobileNo)}</div>
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
          className="employee-action-menu"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={() => setMenu(null)}
          onContextMenu={(event) => event.stopPropagation()}
        >
          {EMPLOYEE_ACTIONS.map((action) => (
            <button
              type="button"
              role="menuitem"
              key={action.id}
              onClick={() => {
                setMenu(null);
                onAction?.(action.id, employee);
              }}
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
