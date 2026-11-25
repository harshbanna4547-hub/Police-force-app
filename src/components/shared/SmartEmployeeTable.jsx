import React from "react";
import EmployeeActionMenu from "./EmployeeActionMenu";
import HindiText from "../../core/HindiText";
import {
  displayEmployeeCell,
  formatEmployeeDateCell,
  getEmployeeBelt,
  getEmployeeMobile,
  getPhoneHref,
  SMART_EMPLOYEE_COLUMNS
} from "./SmartEmployeeTable.logic";
import "./SmartEmployeeTable.css";

/**
 * [COMPONENT] SmartEmployeeTable — डिवाइस-अनुकूल कर्मचारी तालिका
 * Mobile (<= 640px): 5 कॉलम + tap-to-expand; Desktop (> 1024px): सभी 13 कॉलम horizontal scroll सहित
 */
export default function SmartEmployeeTable({
  employees = [],
  onAction,
  caption = "Employee records",
  language = "hi"
}) {
  const english = language === "en";

  return (
    <div className="smart-employee-table-wrap">
      <table className="smart-employee-table employee-responsive-table">
        <caption className="visually-hidden">{caption}</caption>
        {/* === 13 TABLE HEADERS (तालिका शीर्षक) === */}
        <thead>
          <tr>
            {SMART_EMPLOYEE_COLUMNS.map((column) => (
              <th scope="col" key={column.key}>
                {english ? column.label : column.hiLabel}
              </th>
            ))}
          </tr>
        </thead>
        {/* === EMPLOYEE ROWS (कर्मचारी पंक्तियाँ) === */}
        <tbody>
          {employees.map((employee, index) => {
            const phone = getEmployeeMobile(employee);
            const phoneHref = getPhoneHref(phone);
            const withoutDob = employee?.["WITHOUT DOB"] || employee?.["WITHOUR DOB"];
            const cells = [
              <span className="english-cell">{index + 1}</span>,
              <HindiText text={employee.NAME} />,
              <HindiText text={employee["FATHER NAME"]} />,
              <span className="english-cell">{displayEmployeeCell(employee.CADER)}</span>,
              <span className="english-cell smart-belt-cell">{getEmployeeBelt(employee)}</span>,
              <HindiText text={employee.POSTING} />,
              <span className="english-cell">{formatEmployeeDateCell(employee["DATE OF BIRTH"])}</span>,
              phone ? (
                <span className="english-cell">
                  <span>{phone}</span>
                  {phoneHref && (
                    <>
                      {" "}
                      <a
                        className="smart-phone-link"
                        aria-label={`Call ${displayEmployeeCell(employee.NAME)}`}
                        href={`tel:${phoneHref}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        📞
                      </a>
                    </>
                  )}
                </span>
              ) : <span className="english-cell">-</span>,
              <span className="english-cell">{formatEmployeeDateCell(employee["POSTING DOB NO"])}</span>,
              <HindiText text={withoutDob} />,
              <HindiText text={employee.EDUCATION} field="EDUCATION" />,
              <span className="english-cell">{formatEmployeeDateCell(employee["DATE OF JOINING"])}</span>,
              <span className="english-cell smart-doc-cell">
                {formatEmployeeDateCell(employee.DOC || employee["DATE OF CONFIRMATION"])}
              </span>
            ];

            return (
              <EmployeeActionMenu
                key={employee._uid || `${employee["BELT NO"] || index}-${index}`}
                employee={employee}
                onAction={onAction}
                responsiveDetails
                language={language}
              >
                {cells.map((value, cellIndex) => (
                  <td key={SMART_EMPLOYEE_COLUMNS[cellIndex].key}>
                    {React.isValidElement(value) ? value : displayEmployeeCell(value)}
                  </td>
                ))}
              </EmployeeActionMenu>
            );
          })}
          {employees.length === 0 && (
            <tr>
              <td colSpan={SMART_EMPLOYEE_COLUMNS.length} className="smart-empty-row">
                {english ? "No employee records found." : "कोई कर्मचारी रिकॉर्ड नहीं मिला।"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
