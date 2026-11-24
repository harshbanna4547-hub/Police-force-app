import { useMemo, useState } from "react";
import ExportBar from "../../core/ExportBar";
import { appendRowToSheet } from "../../shared/commonFunctions";
import { getMissingTrainingCourses, REQUIRED_COURSES } from "./trainingLogic";
import { openDriveVaultDB } from "../../utils/vaultStorage";
import "./training.css";

const CATEGORIES = [
  { id: "STATE", label: "1. राज्य संस्थान (CDTI / RPA / Intelligence / SCRB / ASTI)" },
  { id: "RPTC", label: "2. समस्त RPTC व PTS (जोधपुर, किशनगढ़, खेरवाड़ा, झालावाड़, कमांडो स्कूल)" },
  { id: "HCM_RIPA", label: "3. HCM RIPA जयपुर" },
  { id: "NATIONAL", label: "4. अन्य राज्य व राष्ट्रीय संस्थान" },
  { id: "DTC", label: "5. जिला प्रशिक्षण केन्द्र (DTC)" },
  { id: "IGOT", label: "6. iGOT कर्मयोगी एवं महिला शक्ति आत्मरक्षा" }
];

const WORKFLOW_TABS = [
  ["GENERATOR", "Letter & Wireless Generator"],
  ["PENDING", "⏳ Pending Training"],
  ["DONE", "✅ Training Done"],
  ["NOT_DONE", "❌ Nominated but Not Done"],
  ["REPORT", "📊 Subject-Wise & Year-Wise Report"],
  ["HISTORY", "Training History"]
];
const TRAINING_LOOKBACK_START = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;

function parseDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const local = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!local) return NaN;
  let year = Number(local[3]);
  if (year < 100) year += year > 40 ? 1900 : 2000;
  return new Date(year, Number(local[2]) - 1, Number(local[1])).getTime();
}

function datesOverlap(from, to, otherFrom, otherTo) {
  const values = [parseDate(from), parseDate(to), parseDate(otherFrom), parseDate(otherTo)];
  return values.every(Number.isFinite) && values[0] <= values[3] && values[2] <= values[1];
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function saveLetterToVault(district, category, fileName, html) {
  const db = await openDriveVaultDB();
  const readTx = db.transaction("drive_items", "readonly");
  const existing = await new Promise((resolve, reject) => {
    const request = readTx.objectStore("drive_items").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const rootName = "09. Training (प्रशिक्षण पत्र एवं बेतार संदेश)";
  const categoryName = CATEGORIES.find((item) => item.id === category)?.label || category;
  const data = await new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" }).arrayBuffer();
  let root = existing.find((item) => item.parentId === "ROOT" && item.kind === "FOLDER" && item.name === rootName && item.district === district);
  const tx = db.transaction("drive_items", "readwrite");
  const store = tx.objectStore("drive_items");
  if (!root) {
    root = { id: `training_${Date.now()}`, parentId: "ROOT", kind: "FOLDER", name: rootName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(root);
  }
  let categoryFolder = existing.find((item) => item.parentId === root.id && item.kind === "FOLDER" && item.name === categoryName && item.district === district);
  if (!categoryFolder) {
    categoryFolder = { id: `training_category_${Date.now()}`, parentId: root.id, kind: "FOLDER", name: categoryName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(categoryFolder);
  }
  store.put({
    id: `training_letter_${Date.now()}`,
    parentId: categoryFolder.id,
    kind: "FILE",
    name: fileName,
    mime: "text/html",
    sizeKB: (data.byteLength / 1024).toFixed(1),
    district,
    updatedAt: new Date().toLocaleDateString("en-IN"),
    data
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Training letter save was aborted"));
  });
  window.dispatchEvent(new Event("police-vault-updated"));
}

function openOrDownload(html, fileName, shouldPrint = false) {
  const blob = new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  if (shouldPrint) {
    const printWindow = window.open(url, "_blank");
    if (!printWindow) window.alert("Print window blocked; file has been downloaded instead.");
    else printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TrainingModule({ records = [], allSheets = {}, setAllSheets, devToHindi = (value) => value, activeProfile = "District" }) {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [tab, setTab] = useState("HISTORY");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employee, setEmployee] = useState(null);
  const [course, setCourse] = useState("");
  const [institute, setInstitute] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [belt, setBelt] = useState("");
  const [name, setName] = useState("");
  const [newCourse, setNewCourse] = useState(REQUIRED_COURSES[0].label);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newInstitute, setNewInstitute] = useState("");
  const [saving, setSaving] = useState(false);

  const history = allSheets.Training_History || [];
  const nominations = allSheets.Training_Nominations || [];
  const filteredNominations = nominations.filter((row) => row.CATEGORY === category);
  const missingRows = getMissingTrainingCourses(records, history).map((row) => ({ ...row, NAME: devToHindi(row.NAME) }));
  const employeeMatches = useMemo(() => {
    const query = employeeQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return records.filter((row) => [devToHindi(row.NAME), row["BELT NO"], row.CADER]
      .some((value) => String(value || "").toLocaleLowerCase().includes(query))).slice(0, 10);
  }, [records, employeeQuery, devToHindi]);
  const employeeHistory = employee
    ? history.filter((row) => String(row["BELT NO"] || "").trim().toUpperCase() === String(employee["BELT NO"] || employee["BELT NO."] || "").trim().toUpperCase())
    : [];
  const recentHistory = employeeHistory.filter((row) => {
    const trainingDate = parseDate(row.TO_DATE || row.FROM_DATE);
    return Number.isFinite(trainingDate) && trainingDate >= TRAINING_LOOKBACK_START;
  });
  const alreadyCompleted = employeeHistory.some((row) =>
    String(row.COURSE_NAME || "").trim().toLocaleLowerCase() === course.trim().toLocaleLowerCase() && course.trim()
  );
  const dateClash = employee && filteredNominations.some((row) =>
    row.STATUS === "PENDING" &&
    String(row["BELT NO"] || "").trim().toUpperCase() === String(employee["BELT NO"] || employee["BELT NO."] || "").trim().toUpperCase() &&
    datesOverlap(fromDate, toDate, row.FROM_DATE, row.TO_DATE)
  );

  const addHistory = (event) => {
    event.preventDefault();
    appendRowToSheet(setAllSheets, "Training_History", {
      "BELT NO": belt.toUpperCase(),
      NAME: name,
      COURSE_NAME: newCourse,
      FROM_DATE: newFrom,
      TO_DATE: newTo,
      INSTITUTE: newInstitute,
      CATEGORY: category,
      STATUS: "COMPLETED"
    }, { prepend: false });
    setNewFrom("");
    setNewTo("");
    setNewInstitute("");
  };

  const generateNomination = async (event) => {
    event.preventDefault();
    if (!employee || !course.trim() || alreadyCompleted || dateClash) return;
    setSaving(true);
    const employeeBelt = employee["BELT NO"] || employee["BELT NO."] || employee.BELT_NO || "";
    const nomination = {
      "BELT NO": employeeBelt,
      NAME: employee.NAME,
      "FATHER NAME": employee["FATHER NAME"],
      CADER: employee.CADER,
      POSTING: employee.POSTING,
      MOBILE: employee["MOBILE NO 1"] || employee["MOBILE NO"] || employee.MOBILE,
      EMAIL: employee.EMAIL,
      EDUCATION: employee.EDUCATION,
      DOB: employee["DATE OF BIRTH"],
      COURSE_NAME: course.trim(),
      INSTITUTE: institute,
      FROM_DATE: fromDate,
      TO_DATE: toDate,
      CATEGORY: category,
      STATUS: "PENDING",
      NOMINATED_AT: new Date().toISOString().slice(0, 10)
    };
    const fields = [
      ["नाम", nomination.NAME], ["पिता का नाम", nomination["FATHER NAME"]], ["पद", nomination.CADER],
      ["बेल्ट नं.", nomination["BELT NO"]], ["वर्तमान पदस्थापन", nomination.POSTING],
      ["मोबाइल नं.", nomination.MOBILE], ["ई-मेल", nomination.EMAIL],
      ["शैक्षणिक योग्यता", nomination.EDUCATION], ["जन्मतिथि", nomination.DOB]
    ];
    const html = `<html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif} .hi{font-family:'DevLys 010','Times New Roman',serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #222;padding:7px}</style></head><body><h2 class="hi">बेतार / ई-मेल नामांकन संदेश</h2><p class="hi">विषय: ${escapeHtml(course)} हेतु नामांकन</p><table>${fields.map(([label, value], index) => `<tr><th>${index + 1}. ${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table><p>संस्थान: ${escapeHtml(institute)} | अवधि: ${escapeHtml(fromDate)} से ${escapeHtml(toDate)}</p></body></html>`;
    const fileName = `${String(employeeBelt || "Employee")}_${course.replace(/[^\w-]+/g, "_")}_Nomination.html`;
    try {
      await saveLetterToVault(activeProfile, category, fileName, html);
      setAllSheets((previous) => ({
        ...previous,
        Training_Nominations: [...(previous.Training_Nominations || []), nomination]
      }));
      openOrDownload(html, fileName);
      setTab("PENDING");
      setEmployee(null);
      setEmployeeQuery("");
      setCourse("");
      setInstitute("");
      setFromDate("");
      setToDate("");
    } catch (error) {
      console.error("Training nomination could not be saved:", error);
      window.alert(`नामांकन Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeTraining = (nomination) => {
    if (!orderNo.trim() || !orderDate) {
      window.alert("प्रशिक्षण पूर्ण करने के लिए DOB आदेश संख्या और दिनांक आवश्यक हैं।");
      return;
    }
    const completed = { ...nomination, STATUS: "COMPLETED", DOB_ORDER_NO: orderNo.trim(), DOB_ORDER_DATE: orderDate };
    const { NAME: employeeName, "BELT NO": employeeBelt, ...historyFields } = completed;
    setAllSheets((previous) => ({
      ...previous,
      Training_Nominations: (previous.Training_Nominations || []).map((row) => row === nomination ? completed : row),
      Training_History: [...(previous.Training_History || []), { ...historyFields, NAME: employeeName, "BELT NO": employeeBelt }]
    }));
    setOrderNo("");
    setOrderDate("");
  };

  const markNotDone = (nomination) => {
    const reason = window.prompt("प्रशिक्षण न कर पाने का कारण लिखें:");
    if (!reason?.trim()) return;
    setAllSheets((previous) => ({
      ...previous,
      Training_Nominations: (previous.Training_Nominations || []).map((row) =>
        row === nomination ? { ...row, STATUS: "NOT_DONE", NOT_DONE_REASON: reason.trim() } : row
      )
    }));
  };

  const categoryHistory = history.filter((row) => !row.CATEGORY || row.CATEGORY === category);
  const reportRows = history.map((row) => ({
    पद: records.find((item) => String(item["BELT NO"] || "") === String(row["BELT NO"] || ""))?.CADER || "",
    ...row,
    YEAR: String(row.TO_DATE || row.FROM_DATE || "").slice(-4)
  }));
  const pendingRows = filteredNominations.filter((row) => row.STATUS === "PENDING");
  const completedRows = filteredNominations.filter((row) => row.STATUS === "COMPLETED");
  const notDoneRows = filteredNominations.filter((row) => row.STATUS === "NOT_DONE");

  return (
    <div className="training-module" style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "18px", border: "1px solid #E2E8F0" }}>
      <h2>🎓 प्रशिक्षण एवं नामांकन प्रबंधन</h2>
      <nav className="training-tabs" aria-label="प्रशिक्षण श्रेणियाँ">
        {CATEGORIES.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </nav>
      <nav className="training-tabs" aria-label="प्रशिक्षण कार्यवाही">
        {WORKFLOW_TABS.map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab === "GENERATOR" && (
        <section>
          <h3>{CATEGORIES.find((item) => item.id === category)?.label} — Letter &amp; Wireless Generator</h3>
          <label>कर्मचारी खोजें (नाम / बेल्ट नं. / पद)
            <input type="search" value={employeeQuery} onChange={(event) => { setEmployeeQuery(event.target.value); setEmployee(null); }} />
          </label>
          <div>{employeeMatches.map((item) => <button type="button" key={item._uid} onClick={() => { setEmployee(item); setEmployeeQuery(devToHindi(item.NAME)); }}>{devToHindi(item.NAME)} · {item["BELT NO"] || "-"} · {item.CADER}</button>)}</div>
          {employee && (
            <>
              <dl className="training-employee-data">
                {[["नाम", employee.NAME], ["पिता का नाम", employee["FATHER NAME"]], ["पद", employee.CADER], ["बेल्ट नं.", employee["BELT NO"] || employee["BELT NO."]], ["वर्तमान पदस्थापन", employee.POSTING], ["मोबाइल नं.", employee["MOBILE NO 1"] || employee["MOBILE NO"]], ["ई-मेल", employee.EMAIL], ["शैक्षणिक योग्यता", employee.EDUCATION], ["जन्मतिथि", employee["DATE OF BIRTH"]]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{devToHindi(value) || "-"}</dd></div>)}
              </dl>
              <p>गत 02 वर्ष के प्रशिक्षण: {recentHistory.map((row) => row.COURSE_NAME).join(", ") || "कोई रिकॉर्ड नहीं"}</p>
              <form onSubmit={generateNomination} className="training-generator-form">
                <input required value={course} onChange={(event) => setCourse(event.target.value)} placeholder="प्रशिक्षण विषय / कोर्स" />
                <input required value={institute} onChange={(event) => setInstitute(event.target.value)} placeholder="संस्थान" />
                <label>From <input required type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
                <label>To <input required type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
                {(alreadyCompleted || dateClash) && <strong role="alert" className="training-clash">⚠️ Date Clash / Already Completed{dateClash ? " — वर्तमान नामांकन की तारीखें overlap हैं" : " — यह कोर्स पहले पूरा किया जा चुका है"}</strong>}
                <button type="submit" disabled={saving || alreadyCompleted || dateClash}>{saving ? "सेव हो रहा है…" : "📨 नामांकन बनाएं, डाउनलोड और Storage में सेव करें"}</button>
                <button type="button" onClick={() => window.print()}>🖨 Print</button>
              </form>
            </>
          )}
        </section>
      )}

      {tab === "PENDING" && <TrainingNominationList rows={pendingRows} onNotDone={markNotDone} />}
      {tab === "DONE" && (
        <section>
          <h3>✅ Training Done</h3>
          {pendingRows.map((row, index) => (
            <div className="training-status-row" key={`${row["BELT NO"]}-${index}`}>
              <span>{row.NAME} · {row.COURSE_NAME}</span>
              <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="DOB आदेश नं." />
              <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} aria-label="DOB आदेश दिनांक" />
              <button type="button" onClick={() => completeTraining(row)}>पूर्ण करें</button>
            </div>
          ))}
          {completedRows.map((row, index) => <p key={`${row["BELT NO"]}-${index}`}>{row.NAME} · {row.COURSE_NAME} · DOB आदेश {row.DOB_ORDER_NO}, {row.DOB_ORDER_DATE}</p>)}
        </section>
      )}
      {tab === "NOT_DONE" && (
        <section>
          <h3>❌ Nominated but Not Done</h3>
          {pendingRows.map((row, index) => <p key={`${row["BELT NO"]}-${index}`}>{row.NAME} · {row.COURSE_NAME} <button type="button" onClick={() => markNotDone(row)}>कारण दर्ज करें</button></p>)}
          {notDoneRows.map((row, index) => <p key={`${row["BELT NO"]}-${index}`}>{row.NAME} · {row.COURSE_NAME} · कारण: {row.NOT_DONE_REASON}</p>)}
        </section>
      )}
      {tab === "REPORT" && (
        <section>
          <h3>📊 Subject-Wise &amp; Year-Wise Report</h3>
          <ExportBar title="विषय एवं वर्ष वार प्रशिक्षण रिपोर्ट" rows={reportRows} fileName="Training_Subject_Year_Report" />
          <ExportBar title="प्रशिक्षण नहीं लेने वाले कर्मचारी" rows={missingRows} fileName="Training_Not_Taken" />
          <p>अपूर्ण आवश्यक कर्मचारी-कोर्स: {missingRows.length}</p>
        </section>
      )}
      {tab === "HISTORY" && (
        <>
          <div className="training-heading">
            <h3>Training History — {CATEGORIES.find((item) => item.id === category)?.label}</h3>
            <ExportBar title="प्रशिक्षण रिकॉर्ड" rows={categoryHistory} fileName="Training_History" />
          </div>
          <form onSubmit={addHistory} className="training-add-form">
            <input required value={belt} onChange={(event) => setBelt(event.target.value)} placeholder="बेल्ट नं." />
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="नाम" />
            <input list="training-course-list" required value={newCourse} onChange={(event) => setNewCourse(event.target.value)} placeholder="कोर्स का नाम" />
            <datalist id="training-course-list">{REQUIRED_COURSES.map((item) => <option key={item.label} value={item.label} />)}</datalist>
            <input type="text" value={newFrom} onChange={(event) => setNewFrom(event.target.value)} placeholder="From (DD-MM-YYYY)" />
            <input type="text" value={newTo} onChange={(event) => setNewTo(event.target.value)} placeholder="To (DD-MM-YYYY)" />
            <input value={newInstitute} onChange={(event) => setNewInstitute(event.target.value)} placeholder="संस्थान" />
            <button type="submit">➕ Add Training</button>
          </form>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>{["BELT NO", "NAME", "COURSE_NAME", "FROM", "TO", "INSTITUTE"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>{categoryHistory.map((row, index) => <tr key={`${row["BELT NO"]}-${index}`}>
                <td>{row["BELT NO"]}</td><td>{devToHindi(row.NAME)}</td><td>{devToHindi(row.COURSE_NAME)}</td>
                <td>{String(row.FROM_DATE || "").split(/[T ]/)[0]}</td><td>{String(row.TO_DATE || "").split(/[T ]/)[0]}</td><td>{devToHindi(row.INSTITUTE)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <h3>आवश्यक प्रशिक्षण रिकॉर्ड की जाँच ({missingRows.length} लंबित कर्मचारी-कोर्स)</h3>
          <ExportBar title="लंबित प्रशिक्षण सूची" rows={missingRows} fileName="Training_Missing_Courses" />
          <div style={{ overflowX: "auto" }}>
            <table><thead><tr>{["बेल्ट नं.", "पद", "नाम", "कोर्स"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>{missingRows.map((row, index) => <tr key={`${row["BELT NO"]}-${index}`}><td>{row["BELT NO"]}</td><td>{row.CADER}</td><td>{row.NAME}</td><td>{row["अपूर्ण कोर्स"]}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TrainingNominationList({ rows, onNotDone }) {
  return (
    <section>
      <h3>⏳ Pending Training ({rows.length})</h3>
      {rows.map((row, index) => <p key={`${row["BELT NO"]}-${index}`}>{row.NAME} · {row["BELT NO"]} · {row.COURSE_NAME} · {row.FROM_DATE}—{row.TO_DATE} <button type="button" onClick={() => onNotDone(row)}>प्रशिक्षण नहीं किया</button></p>)}
      {rows.length === 0 && <p>कोई प्रशिक्षण लंबित नहीं है।</p>}
    </section>
  );
}
