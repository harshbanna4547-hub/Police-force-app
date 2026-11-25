import React, { useEffect, useRef, useState } from "react";
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
  nameCellIndex = 1,
  language = "hi"
}) {
  const [menu, setMenu] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const menuRef = useRef(null);
  const english = language === "en";
  const mobileNo = getEmployeePhone(employee);
  const phoneNumber = getCallablePhone(mobileNo);

  useEffect(() => {
    if (!menu) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenu(null);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

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
        className={`employee-action-row ${responsiveDetails ? "has-responsive-details" : ""}`}
        title={english ? "Click or right-click for employee actions" : "कर्मचारी कार्यवाही के लिए क्लिक या राइट-क्लिक करें"}
      >
        {rowCells}
      </tr>
      {responsiveDetails && detailsOpen && (
        <tr className="employee-detail-row">
          <td colSpan={13} className="employee-detail-cell">
            <div className="employee-detail-card">
              {EMPLOYEE_DETAIL_FIELDS.map(([label, key]) => {
                const rawVal = key === "WITHOUT DOB"
                  ? (employee?.["WITHOUT DOB"] || employee?.["WITHOUR DOB"])
                  : key === "DOC"
                    ? (employee?.DOC || employee?.["DATE OF CONFIRMATION"])
                    : employee?.[key];
                return (
                  <div key={key}>
                    <strong>{label}</strong>
                    <div>
                      {key === "POSTING" || key === "WITHOUT DOB"
                        ? <HindiText text={rawVal} />
                        : displayDetailValue(rawVal, key)}
                    </div>
                  </div>
                );
              })}
              <div>
                <strong>Mobile Number</strong>
                <div>
                  {mobileNo || "-"}
                  {phoneNumber && (
                    <>
                      {" "}
                      <a href={`tel:${phoneNumber}`} className="employee-phone-inline-link">📞</a>
                    </>
                  )}
                </div>
              </div>
              <div className="employee-detail-actions">
                {phoneNumber && (
                  <a className="employee-detail-action-btn" href={`tel:${phoneNumber}`}>
                    📞 {english ? "Call" : "कॉल"}
                  </a>
                )}
                {EMPLOYEE_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="employee-detail-action-btn"
                    onClick={() => onAction?.(action.id, employee)}
                  >
                    {english ? action.label : action.hiLabel}
                  </button>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
      {menu && createPortal(
        <div
          ref={menuRef}
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
              {english ? action.label : action.hiLabel}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
