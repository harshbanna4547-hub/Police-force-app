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

const ENGLISH_CELL_STYLE = { fontFamily: "'Times New Roman', Times, serif" };

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
        <thead>
          <tr>
            {SMART_EMPLOYEE_COLUMNS.map((column) => (
              <th scope="col" key={column.key}>
                {english ? column.label : column.hiLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => {
            const phone = getEmployeeMobile(employee);
            const phoneHref = getPhoneHref(phone);
            const withoutDob = employee?.["WITHOUT DOB"] || employee?.["WITHOUR DOB"];
            const cells = [
              <span style={ENGLISH_CELL_STYLE}>{index + 1}</span>,
              <HindiText text={employee.NAME} />,
              <HindiText text={employee["FATHER NAME"]} />,
              <span style={ENGLISH_CELL_STYLE}>{displayEmployeeCell(employee.CADER)}</span>,
              <span style={{ ...ENGLISH_CELL_STYLE, fontWeight: "bold", color: "#0369A1" }}>{getEmployeeBelt(employee)}</span>,
              <HindiText text={employee.POSTING} />,
              <span style={ENGLISH_CELL_STYLE}>{formatEmployeeDateCell(employee["DATE OF BIRTH"])}</span>,
              phone ? (
                <span style={ENGLISH_CELL_STYLE}>
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
              ) : <span style={ENGLISH_CELL_STYLE}>-</span>,
              <span style={ENGLISH_CELL_STYLE}>{formatEmployeeDateCell(employee["POSTING DOB NO"])}</span>,
              <HindiText text={withoutDob} />,
              <span style={ENGLISH_CELL_STYLE}>{displayEmployeeCell(employee.EDUCATION)}</span>,
              <span style={ENGLISH_CELL_STYLE}>{formatEmployeeDateCell(employee["DATE OF JOINING"])}</span>,
              <span style={{ ...ENGLISH_CELL_STYLE, color: "#15803D", fontWeight: "bold" }}>
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
              <td colSpan={SMART_EMPLOYEE_COLUMNS.length} style={{ textAlign: "center", padding: "18px", color: "#64748B" }}>
                {english ? "No employee records found." : "कोई कर्मचारी रिकॉर्ड नहीं मिला।"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
