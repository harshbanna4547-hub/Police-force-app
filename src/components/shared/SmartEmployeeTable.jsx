import EmployeeActionMenu from "./EmployeeActionMenu";
import HindiText from "../../core/HindiText";
import {
  displayEmployeeCell,
  getEmployeeMobile,
  getPhoneHref,
  SMART_EMPLOYEE_COLUMNS
} from "./SmartEmployeeTable.logic";
import "./SmartEmployeeTable.css";

export default function SmartEmployeeTable({
  employees = [],
  onAction,
  caption = "Employee records"
}) {
  return (
    <div className="smart-employee-table-wrap">
      <table className="smart-employee-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {SMART_EMPLOYEE_COLUMNS.map((column) => (
              <th scope="col" key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => {
            const phone = getEmployeeMobile(employee);
            const phoneHref = getPhoneHref(phone);
            const cells = [
              index + 1,
              <HindiText text={employee.NAME} />,
              <HindiText text={employee["FATHER NAME"]} />,
              employee.CADER,
              employee["BELT NO"] || employee["BELT NO."] || employee.BELT,
              <HindiText text={employee.POSTING} />,
              employee["DATE OF BIRTH"],
              phone
                ? <><span>{displayEmployeeCell(phone)}</span>{" "}<a aria-label={`Call ${displayEmployeeCell(employee.NAME)}`} href={`tel:${phoneHref}`}>📞</a></>
                : "-",
              employee["POSTING DOB NO"],
              employee["WITHOUT DOB"],
              employee.EDUCATION,
              employee["DATE OF JOINING"],
              employee.DOC || employee["DATE OF CONFIRMATION"]
            ];

            return (
              <EmployeeActionMenu
                key={employee._uid || `${employee["BELT NO"] || index}-${index}`}
                employee={employee}
                onAction={onAction}
                responsiveDetails
              >
                {cells.map((value, cellIndex) => (
                  <td key={SMART_EMPLOYEE_COLUMNS[cellIndex].key}>
                    {displayEmployeeCell(value)}
                  </td>
                ))}
              </EmployeeActionMenu>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
