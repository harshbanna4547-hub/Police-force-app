import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, formatDateOnly, getRankCode } from "../../shared/commonFunctions";
import { getMissingTrainingCourses, getTrainingEmployeeKey, isBeltRank, REQUIRED_COURSES, sameTrainingEmployee } from "./trainingLogic";
import { renderTrainingDocument, TRAINING_DOCUMENTS } from "./trainingTemplates";
import { openDriveVaultDB } from "../../utils/vaultStorage";
import "./training.css";

const CATEGORIES = [
  { id: "STATE", label: "राज्य संस्थान (CDTI / RPA / Intelligence / SCRB / ASTI)", enLabel: "State Institutes (CDTI / RPA / Intelligence / SCRB / ASTI)" },
  { id: "RPTC", label: "समस्त RPTC व PTS (जोधपुर, किशनगढ़, खेरवाड़ा, झालावाड़, कमांडो स्कूल)", enLabel: "All RPTC & PTS (Jodhpur, Kishangarh, Kherwara, Jhalawar)" },
  { id: "HCM_RIPA", label: "HCM RIPA जयपुर", enLabel: "HCM RIPA Jaipur" },
  { id: "NATIONAL", label: "अन्य राज्य व राष्ट्रीय संस्थान (CDTI, CAPT Bhopal, NEPA, NCRB, IIM, NFSU)", enLabel: "National & Other State Institutes" },
  { id: "DTC", label: "जिला प्रशिक्षण केन्द्र (DTC पुलिस लाइन चित्तौड़गढ़)", enLabel: "District Training Center (DTC Police Line)" },
  { id: "IGOT", label: "iGOT कर्मयोगी एवं महिला शक्ति आत्मरक्षा", enLabel: "iGOT Karmayogi & Women Self-Defence" }
];

const WORKFLOW_TABS = [
  { id: "GENERATOR", hi: "पत्र एवं बेतार संदेश जनरेटर", en: "Letter & Wireless Generator" },
  { id: "PENDING", hi: "⏳ लंबित प्रशिक्षण", en: "⏳ Pending Training" },
  { id: "DONE", hi: "✅ प्रशिक्षण पूर्ण", en: "✅ Training Done" },
  { id: "NOT_DONE", hi: "❌ नामांकित किंतु अनुपस्थित", en: "❌ Nominated but Not Done" },
  { id: "REPORT", hi: "📊 विषय एवं वर्ष-वार रिपोर्ट", en: "📊 Subject & Year-Wise Report" },
  { id: "HISTORY", hi: "प्रशिक्षण इतिहास", en: "Training History" }
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

function getTrainingYear(value) {
  const timestamp = parseDate(value);
  return Number.isFinite(timestamp) ? String(new Date(timestamp).getFullYear()) : "";
}

function datesOverlap(from, to, otherFrom, otherTo) {
  const values = [parseDate(from), parseDate(to), parseDate(otherFrom), parseDate(otherTo)];
  return values.every(Number.isFinite) && values[0] <= values[3] && values[2] <= values[1];
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

export default function TrainingModule({ records = [], allSheets = {}, setAllSheets, activeProfile = "District", language = "hi" }) {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [tab, setTab] = useState("HISTORY");
  const [gender, setGender] = useState("ALL");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employee, setEmployee] = useState(null);
  const [course, setCourse] = useState("");
  const [institute, setInstitute] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [newCourse, setNewCourse] = useState(REQUIRED_COURSES[0].label);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newInstitute, setNewInstitute] = useState("");
  const [saving, setSaving] = useState(false);
  const [documentType, setDocumentType] = useState("WIRELESS");
  const [documentInstructions, setDocumentInstructions] = useState("");
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [missingRank, setMissingRank] = useState("ALL");
  const [missingCourse, setMissingCourse] = useState("ALL");
  const [missingSearch, setMissingSearch] = useState("");
  const [missingPage, setMissingPage] = useState(0);
  const [reportYear, setReportYear] = useState("ALL");
  const [reportRank, setReportRank] = useState("ALL");
  const [reportCourse, setReportCourse] = useState("ALL");
  const [womenMonth, setWomenMonth] = useState(new Date().toISOString().slice(0, 7));
  const [womenForm, setWomenForm] = useState({
    INSTITUTION: "", FROM_DATE: "", TO_DATE: "", MASTER_TRAINER: "",
    AGE_13_18: "", AGE_18_35: "", AGE_35_PLUS: ""
  });
  const [dtcForm, setDtcForm] = useState({
    WEEK_FROM: "", WEEK_TO: "", POLICE_STATION: "", COURSE_NAME: "", INSTRUCTOR: "", TRAINEES: ""
  });
  const english = language === "en";

  const genderFilteredRecords = useMemo(() => filterEmployeesByGender(records, gender), [records, gender]);
  const history = useMemo(() => allSheets.Training_History || [], [allSheets]);
  const nominations = useMemo(() => allSheets.Training_Nominations || [], [allSheets]);
  const igotRows = useMemo(() => allSheets.Training_iGOT || [], [allSheets]);
  const womenRows = useMemo(() => allSheets.Training_Women_Programs || [], [allSheets]);
  const dtcRows = useMemo(() => allSheets.Training_DTC_Roster || [], [allSheets]);
  const filteredNominations = nominations.filter((row) => row.CATEGORY === category);
  const missingRows = useMemo(
    () => getMissingTrainingCourses(genderFilteredRecords, history),
    [genderFilteredRecords, history]
  );
  const filteredMissingRows = missingRows.filter((row) => {
    if (missingRank !== "ALL" && getRankCode(row.employee) !== missingRank) return false;
    if (missingCourse !== "ALL" && !row["अपूर्ण कोर्स"].includes(missingCourse)) return false;
    const q = missingSearch.trim();
    return !q || matchesEmployeeSearch(row, q, ["NAME", "BELT NO", "CADER", "POSTING"]);
  });
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filteredMissingRows.length / pageSize));
  const pagedMissingRows = filteredMissingRows.slice(missingPage * pageSize, (missingPage + 1) * pageSize);

  const employeeMatches = useMemo(() => {
    const query = employeeQuery.trim();
    if (!query) return [];
    return genderFilteredRecords.filter((row) => matchesEmployeeSearch(row, query, ["NAME", "BELT NO", "CADER", "POSTING"])).slice(0, 10);
  }, [genderFilteredRecords, employeeQuery]);

  const employeeHistory = employee
    ? history.filter((row) => sameTrainingEmployee(employee, row))
    : [];
  const normalizeCourseAliases = (value) => {
    const normalized = String(value || "").trim().toLocaleLowerCase();
    const required = REQUIRED_COURSES.find((item) =>
      item.label.toLocaleLowerCase() === normalized ||
      item.aliases.some((alias) => alias.toLocaleLowerCase() === normalized)
    );
    return required ? required.aliases.map((alias) => alias.toLocaleLowerCase()) : [normalized];
  };
  const recentHistory = employeeHistory.filter((row) => {
    const trainingDate = parseDate(row.TO_DATE || row.FROM_DATE);
    return Number.isFinite(trainingDate) && trainingDate >= TRAINING_LOOKBACK_START;
  });
  const alreadyCompleted = employeeHistory.some((row) =>
    normalizeCourseAliases(course).some((alias) =>
      alias && String(row.COURSE_NAME || "").toLocaleLowerCase().includes(alias)
    )
  );
  const invalidTrainingRange = Number.isFinite(parseDate(fromDate)) &&
    Number.isFinite(parseDate(toDate)) && parseDate(fromDate) > parseDate(toDate);
  const dateClash = employee && nominations.some((row) =>
    row.STATUS === "PENDING" &&
    sameTrainingEmployee(employee, row) &&
    datesOverlap(fromDate, toDate, row.FROM_DATE, row.TO_DATE)
  );

  const addHistory = async (event) => {
    event.preventDefault();
    const employeeBelt = detailEmployee?.["BELT NO"] || detailEmployee?.["BELT NO."] || "";
    const employeeName = detailEmployee?.NAME || "";
    const row = {
      "BELT NO": String(employeeBelt || "").toUpperCase(),
      NAME: employeeName,
      COURSE_NAME: newCourse,
      FROM_DATE: newFrom,
      TO_DATE: newTo,
      INSTITUTE: newInstitute,
      CATEGORY: category,
      STATUS: "COMPLETED",
      CADER: detailEmployee?.CADER || "",
      _uid: detailEmployee?._uid
    };
    const recordHtml = renderTrainingDocument("WIRELESS", {
      ...row,
      "FATHER NAME": detailEmployee?.["FATHER NAME"],
      CADER: detailEmployee?.CADER,
      POSTING: detailEmployee?.POSTING,
      MOBILE: detailEmployee?.["MOBILE NO 1"] || detailEmployee?.["MOBILE NO"],
      EMAIL: detailEmployee?.EMAIL,
      EDUCATION: detailEmployee?.EDUCATION,
      DOB: detailEmployee?.["DATE OF BIRTH"]
    });
    try {
      await saveLetterToVault(activeProfile, category, `Training_History_${Date.now()}.html`, recordHtml);
      appendRowToSheet(setAllSheets, "Training_History", row, { prepend: false });
    } catch (error) {
      console.error("Training history could not be saved to Storage Vault:", error);
      window.alert(`प्रशिक्षण रिकॉर्ड Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
      return;
    }
    setNewFrom("");
    setNewTo("");
    setNewInstitute("");
    setNewCourse(REQUIRED_COURSES[0].label);
    setDetailEmployee(null);
  };

  const makeNomination = () => {
    const employeeBelt = employee["BELT NO"] || employee["BELT NO."] || employee.BELT_NO || "";
    return {
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
      NOMINATED_AT: new Date().toISOString().slice(0, 10),
      _uid: employee._uid
    };
  };

  const generateOtherDocument = async () => {
    if (!employee || !course.trim() || !fromDate || !toDate || !institute.trim() || invalidTrainingRange) return;
    setSaving(true);
    const nomination = makeNomination();
    const html = renderTrainingDocument(documentType, nomination, documentInstructions);
    const fileName = `${String(nomination["BELT NO"] || "Employee")}_${documentType}_${Date.now()}.html`;
    try {
      await saveLetterToVault(activeProfile, category, fileName, html);
      openOrDownload(html, fileName, true);
      setDocumentInstructions("");
    } catch (error) {
      console.error("Training document could not be saved:", error);
      window.alert(`प्रशिक्षण पत्र Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const generateNomination = async (event) => {
    event.preventDefault();
    if (!employee || !course.trim() || alreadyCompleted || dateClash || invalidTrainingRange) return;
    setSaving(true);
    const nomination = makeNomination();
    const html = renderTrainingDocument("WIRELESS", nomination);
    const fileName = `${String(nomination["BELT NO"] || "Employee")}_${course.replace(/[^\w-]+/g, "_")}_Nomination.html`;
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

  const reportRows = history.map((row) => ({
    पद: records.find((item) => sameTrainingEmployee(item, row))?.CADER || "",
    ...row,
    YEAR: getTrainingYear(row.TO_DATE || row.FROM_DATE)
  }));
  const pendingRows = filteredNominations.filter((row) => row.STATUS === "PENDING");
  const completedRows = filteredNominations.filter((row) => row.STATUS === "COMPLETED");
  const notDoneRows = filteredNominations.filter((row) => row.STATUS === "NOT_DONE");
  const uniqueRecords = [...new Map(genderFilteredRecords.map((record) => [getTrainingEmployeeKey(record), record])).values()];
  const detailHistory = detailEmployee
    ? history.filter((row) => sameTrainingEmployee(detailEmployee, row))
    : [];
  const detailMissing = detailEmployee
    ? missingRows.find((row) => sameTrainingEmployee(row.employee, detailEmployee))?.["अपूर्ण कोर्स"] || []
    : [];
  const detailPending = detailEmployee
    ? nominations.filter((row) => row.STATUS === "PENDING" && sameTrainingEmployee(row, detailEmployee))
    : [];
  const igotData = uniqueRecords.map((record, index) => {
    const beltNo = record["BELT NO"] || record["BELT NO."] || "";
    const tracking = igotRows.find((row) => sameTrainingEmployee(row, record)) || {};
    return {
      "S.N.": index + 1,
      Post: record.CADER || "",
      "Belt No.": isBeltRank(record) ? beltNo : "-",
      Name: record.NAME || "",
      Posting: record.POSTING || "",
      "SSO ID": tracking.SSO_ID || record.SSO_ID || "",
      Mobile: record["MOBILE NO 1"] || record["MOBILE NO"] || "",
      Registered: String(tracking.REGISTERED || "No").toLowerCase() === "yes" ? "Yes" : "No",
      "AI Courses": Number(tracking.AI_COURSES || 0),
      "Other Courses": Number(tracking.OTHER_COURSES || 0),
      _key: getTrainingEmployeeKey(record),
      _record: record
    };
  });
  const registeredCount = igotData.filter((row) => String(row.Registered).toLowerCase() === "yes").length;
  const igotCompletedCount = igotData.filter((row) => row["AI Courses"] + row["Other Courses"] > 0).length;
  const currentWomenRows = womenRows.filter((row) => !womenMonth || String(row.FROM_DATE || "").slice(0, 7) === womenMonth);
  const currentDtcRows = dtcRows.filter((row) => !womenMonth || String(row.WEEK_FROM || "").slice(0, 7) === womenMonth);
  const womenTotal = ["AGE_13_18", "AGE_18_35", "AGE_35_PLUS"].reduce((total, key) => total + Number(womenForm[key] || 0), 0);

  const updateIgot = (record, field, value) => {
    setAllSheets((previous) => {
      const current = previous.Training_iGOT || [];
      const existing = current.find((row) => sameTrainingEmployee(row, record));
      const base = existing || {
        "BELT NO": record["BELT NO"] || record["BELT NO."] || "",
        NAME: record.NAME,
        CADER: record.CADER,
        POSTING: record.POSTING,
        _uid: record._uid
      };
      const next = { ...base, [field]: value };
      return {
        ...previous,
        Training_iGOT: existing
          ? current.map((row) => sameTrainingEmployee(row, record) ? next : row)
          : [...current, next]
      };
    });
  };

  const exportIgotExcel = () => {
    const rows = igotData.map((row) => ({
      "S.N.": row["S.N."],
      Post: row.Post,
      "Belt No.": row["Belt No."],
      Name: row.Name,
      Posting: row.Posting,
      "SSO ID": row["SSO ID"],
      Mobile: row.Mobile,
      Registered: row.Registered,
      "AI Courses": row["AI Courses"],
      "Other Courses": row["Other Courses"]
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "MDO Admin");
    XLSX.writeFile(book, `MDO_Admin_iGOT_${womenMonth || "Report"}.xlsx`);
  };

  const addWomenProgram = async (event) => {
    event.preventDefault();
    const row = { ...womenForm, TOTAL: womenTotal, CATEGORY: "IGOT", CREATED_AT: new Date().toISOString() };
    const reportHtml = renderTrainingDocument("WIRELESS", {
      NAME: row.INSTITUTION,
      "FATHER NAME": "",
      CADER: "महिला शक्ति आत्मरक्षा",
      "BELT NO": "",
      POSTING: row.MASTER_TRAINER,
      MOBILE: "",
      EMAIL: "",
      EDUCATION: "",
      DOB: "",
      COURSE_NAME: "महिला शक्ति आत्मरक्षा प्रशिक्षण",
      INSTITUTE: row.INSTITUTION,
      FROM_DATE: row.FROM_DATE,
      TO_DATE: row.TO_DATE
    });
    try {
      await saveLetterToVault(activeProfile, "IGOT", `Women_Shakti_${Date.now()}.html`, reportHtml);
      setAllSheets((previous) => ({
        ...previous,
        Training_Women_Programs: [...(previous.Training_Women_Programs || []), row]
      }));
    } catch (error) {
      console.error("Women's self-defence report could not be saved:", error);
      window.alert(`महिला शक्ति रिपोर्ट Storage Vault में सुरक्षित नहीं हो सकी: ${error.message}`);
      return;
    }
    setWomenForm({ INSTITUTION: "", FROM_DATE: "", TO_DATE: "", MASTER_TRAINER: "", AGE_13_18: "", AGE_18_35: "", AGE_35_PLUS: "" });
  };

  const addDtcRoster = async (event) => {
    event.preventDefault();
    const row = { ...dtcForm, CATEGORY: "DTC", CREATED_AT: new Date().toISOString() };
    const reportHtml = renderTrainingDocument("WIRELESS", {
      NAME: row.POLICE_STATION,
      "FATHER NAME": "",
      CADER: "DTC साप्ताहिक प्रशिक्षण",
      "BELT NO": "",
      POSTING: row.INSTRUCTOR,
      MOBILE: "",
      EMAIL: "",
      EDUCATION: "",
      DOB: "",
      COURSE_NAME: row.COURSE_NAME,
      INSTITUTE: "DTC पुलिस लाइन चित्तौड़गढ़",
      FROM_DATE: row.WEEK_FROM,
      TO_DATE: row.WEEK_TO
    });
    try {
      await saveLetterToVault(activeProfile, "DTC", `DTC_Weekly_${Date.now()}.html`, reportHtml);
      setAllSheets((previous) => ({
        ...previous,
        Training_DTC_Roster: [...(previous.Training_DTC_Roster || []), row]
      }));
      setDtcForm({ WEEK_FROM: "", WEEK_TO: "", POLICE_STATION: "", COURSE_NAME: "", INSTRUCTOR: "", TRAINEES: "" });
    } catch (error) {
      console.error("DTC weekly roster could not be saved:", error);
      window.alert(`DTC रोस्टर Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
    }
  };

  const reportYears = [...new Set(reportRows.map((row) => row.YEAR).filter(Boolean))].sort().reverse();
  const filteredReportRows = reportRows.filter((row) =>
    (reportYear === "ALL" || row.YEAR === reportYear) &&
    (reportRank === "ALL" || getRankCode(row["पद"]) === reportRank) &&
    (reportCourse === "ALL" || String(row.COURSE_NAME || "").toLocaleLowerCase().includes(reportCourse.toLocaleLowerCase()))
  );

  const toolbarExportRows = tab === "REPORT"
    ? filteredReportRows
    : filteredMissingRows.map((row, index) => ({
      "क्र.सं.": index + 1,
      "पद (Post)": row.CADER,
      "बेल्ट नं.": isBeltRank(row.employee) ? row["BELT NO"] : "-",
      "नाम": row.NAME,
      "वर्तमान पदस्थापन": row.POSTING,
      "पूर्ण प्रशिक्षण संख्या": row["पूर्ण प्रशिक्षण संख्या"],
      "लंबित आवश्यक प्रशिक्षण": row["अपूर्ण कोर्स"].join(", ")
    }));

  return (
    <div className="training-module">
      <ModuleHeaderToolbar
        title={english ? "🎓 Training & Nomination Management" : "🎓 प्रशिक्षण एवं नामांकन प्रबंधन"}
        search={missingSearch}
        onSearchChange={(val) => {
          setMissingSearch(val);
          setMissingPage(0);
        }}
        gender={gender}
        onGenderChange={(val) => {
          setGender(val);
          setMissingPage(0);
        }}
        rows={toolbarExportRows}
        fileName={tab === "REPORT" ? "Training_Subject_Year_Report" : "Training_Missing_Courses"}
        language={language}
      />

      <nav className="training-tabs" aria-label={english ? "Training categories" : "प्रशिक्षण श्रेणियाँ"}>
        {CATEGORIES.map((item) => (
          <button type="button" key={item.id} aria-pressed={category === item.id} onClick={() => { setCategory(item.id); if (item.id === "IGOT") setTab("HISTORY"); }}>
            {english ? item.enLabel : item.label}
          </button>
        ))}
      </nav>
      <nav className="training-tabs" aria-label={english ? "Training actions" : "प्रशिक्षण कार्यवाही"}>
        {WORKFLOW_TABS.map((tItem) => (
          <button type="button" key={tItem.id} aria-pressed={tab === tItem.id} onClick={() => setTab(tItem.id)}>
            {english ? tItem.en : tItem.hi}
          </button>
        ))}
      </nav>

      {tab === "GENERATOR" && (
        <section>
          <h3>{english ? CATEGORIES.find((item) => item.id === category)?.enLabel : CATEGORIES.find((item) => item.id === category)?.label} — Letter &amp; Wireless Generator</h3>
          <label>{english ? "Search Employee (Name / Belt / Post)" : "कर्मचारी खोजें (नाम / बेल्ट नं. / पद)"}
            <input type="search" value={employeeQuery} onChange={(event) => { setEmployeeQuery(event.target.value); setEmployee(null); }} />
          </label>
          <div className="training-match-pills">
            {employeeMatches.map((item) => (
              <button type="button" key={item._uid} onClick={() => setEmployee(item)} className="training-match-pill">
                <HindiText text={item.NAME} /> · {item["BELT NO"] || "-"} · {item.CADER}
              </button>
            ))}
          </div>
          {employee && (
            <>
              <dl className="training-employee-data">
                {[
                  [english ? "Name" : "नाम", employee.NAME, true],
                  [english ? "Father Name" : "पिता का नाम", employee["FATHER NAME"], true],
                  [english ? "Post" : "पद", employee.CADER, false],
                  [english ? "Belt No." : "बेल्ट नं.", employee["BELT NO"] || employee["BELT NO."], false],
                  [english ? "Current Posting" : "वर्तमान पदस्थापन", employee.POSTING, true],
                  [english ? "Mobile No." : "मोबाइल नं.", employee["MOBILE NO 1"] || employee["MOBILE NO"], false],
                  [english ? "Email" : "ई-मेल", employee.EMAIL, false],
                  [english ? "Education" : "शैक्षणिक योग्यता", employee.EDUCATION, false],
                  [english ? "DOB" : "जन्मतिथि", formatDateOnly(employee["DATE OF BIRTH"]), false]
                ].map(([label, value, isHindi]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{isHindi ? <HindiText text={value} /> : (value || "-")}</dd>
                  </div>
                ))}
              </dl>
              <p>{english ? "Recent 2-year trainings" : "गत 02 वर्ष के प्रशिक्षण"}: {recentHistory.map((row) => `${row.COURSE_NAME} (${formatDateOnly(row.FROM_DATE)}–${formatDateOnly(row.TO_DATE)})`).join(", ") || (english ? "None" : "कोई रिकॉर्ड नहीं")}</p>
              <form onSubmit={(event) => {
                if (documentType === "WIRELESS") generateNomination(event);
                else {
                  event.preventDefault();
                  generateOtherDocument();
                }
              }} className="training-generator-form">
                <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Training document type">
                  {TRAINING_DOCUMENTS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                </select>
                <input required value={course} onChange={(event) => setCourse(event.target.value)} placeholder={english ? "Course / Subject" : "प्रशिक्षण विषय / कोर्स"} />
                <input required value={institute} onChange={(event) => setInstitute(event.target.value)} placeholder={english ? "Institute" : "संस्थान"} />
                <label>From <input required type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
                <label>To <input required type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
                {documentType !== "WIRELESS" && <input value={documentInstructions} onChange={(event) => setDocumentInstructions(event.target.value)} placeholder={english ? "Reason / Instructions" : "कारण / अतिरिक्त निर्देश"} />}
                {invalidTrainingRange && <strong role="alert" className="training-clash">⚠️ {english ? "End date cannot be before start date." : "प्रशिक्षण की समाप्ति तिथि, आरंभ तिथि से पहले नहीं हो सकती।"}</strong>}
                {(alreadyCompleted || dateClash) && <strong role="alert" className="training-clash">⚠️ Date Clash / Already Completed</strong>}
                <button type="submit" disabled={saving || invalidTrainingRange || (documentType === "WIRELESS" && (alreadyCompleted || dateClash))}>
                  {saving ? (english ? "Saving…" : "सेव हो रहा है…") : (english ? "📨 Create, Download & Save" : "📨 दस्तावेज़ बनाएं, डाउनलोड और Storage में सेव करें")}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {tab === "PENDING" && <TrainingNominationList rows={pendingRows} onNotDone={markNotDone} english={english} />}
      {tab === "DONE" && (
        <section>
          <h3>✅ {english ? "Training Done" : "प्रशिक्षण पूर्ण"}</h3>
          {pendingRows.map((row, index) => (
            <div className="training-status-row" key={`${row["BELT NO"]}-${index}`}>
              <span><HindiText text={row.NAME} /> · {row.COURSE_NAME}</span>
              <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="DOB आदेश नं." />
              <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} aria-label="DOB आदेश दिनांक" />
              <button type="button" onClick={() => completeTraining(row)}>{english ? "Complete" : "पूर्ण करें"}</button>
            </div>
          ))}
          {completedRows.map((row, index) => (
            <p key={`${row["BELT NO"]}-${index}`}><HindiText text={row.NAME} /> · {row.COURSE_NAME} · DOB {row.DOB_ORDER_NO}, {row.DOB_ORDER_DATE}</p>
          ))}
        </section>
      )}
      {tab === "NOT_DONE" && (
        <section>
          <h3>❌ {english ? "Nominated but Not Done" : "नामांकित किंतु अनुपस्थित"}</h3>
          {pendingRows.map((row, index) => (
            <p key={`${row["BELT NO"]}-${index}`}><HindiText text={row.NAME} /> · {row.COURSE_NAME} <button type="button" onClick={() => markNotDone(row)}>{english ? "Enter Reason" : "कारण दर्ज करें"}</button></p>
          ))}
          {notDoneRows.map((row, index) => (
            <p key={`${row["BELT NO"]}-${index}`}><HindiText text={row.NAME} /> · {row.COURSE_NAME} · {row.NOT_DONE_REASON}</p>
          ))}
        </section>
      )}
      {tab === "HISTORY" && category === "IGOT" && (
        <section className="training-igot">
          <div className="training-section-heading">
            <h3>{english ? "Section A — iGOT Karmayogi Portal Tracking & MDO Admin Report" : "खंड A — iGOT कर्मयोगी पोर्टल ट्रैकिंग व MDO Admin मासिक रिपोर्ट"}</h3>
            <div className="training-summary-cards">
              <article><span>{english ? "Total Force" : "कुल नफरी"}</span><strong>{uniqueRecords.length}</strong></article>
              <article><span>{english ? "Registered" : "पंजीकृत कर्मचारी"}</span><strong>{registeredCount}</strong></article>
              <article><span>{english ? "Courses Completed" : "कोर्स पूर्ण करने वाले"}</span><strong>{igotCompletedCount}</strong></article>
            </div>
            <label>{english ? "Month" : "माह"} <input type="month" value={womenMonth} onChange={(event) => setWomenMonth(event.target.value)} /></label>
            <button type="button" onClick={exportIgotExcel}>📊 MDO Admin Excel (English)</button>
          </div>
          <div className="training-table-scroll table-responsive-box">
            <table className="training-data-table">
              <thead><tr>{["S.N.", "Post", "Belt No.", "Name", "Posting", "SSO ID", "Mobile", "Registered", "AI Courses", "Other Courses"].map((item) => <th key={item}>{item}</th>)}</tr></thead>
              <tbody>{igotData.map((row) => (
                <tr key={row._key}>
                  <td>{row["S.N."]}</td><td>{row.Post}</td><td>{row["Belt No."]}</td><td><HindiText text={row.Name} /></td>
                  <td><HindiText text={row.Posting} /></td>
                  <td><input aria-label={`SSO ID ${row.Name}`} value={row["SSO ID"]} onChange={(event) => updateIgot(row._record, "SSO_ID", event.target.value)} /></td>
                  <td>{row.Mobile}</td>
                  <td><select aria-label={`Registration status ${row.Name}`} value={row.Registered} onChange={(event) => updateIgot(row._record, "REGISTERED", event.target.value)}><option>No</option><option>Yes</option></select></td>
                  <td><input type="number" min="0" aria-label={`AI courses ${row.Name}`} value={row["AI Courses"]} onChange={(event) => updateIgot(row._record, "AI_COURSES", event.target.value)} /></td>
                  <td><input type="number" min="0" aria-label={`Other courses ${row.Name}`} value={row["Other Courses"]} onChange={(event) => updateIgot(row._record, "OTHER_COURSES", event.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <h3>{english ? "Section B — Women Self-Defence Training" : "खंड B — महिला शक्ति आत्मरक्षा प्रशिक्षण (रानी लक्ष्मीबाई केन्द्र)"}</h3>
          <form onSubmit={addWomenProgram} className="training-women-form">
            <input required value={womenForm.INSTITUTION} onChange={(event) => setWomenForm({ ...womenForm, INSTITUTION: event.target.value })} placeholder={english ? "School / College Name" : "विद्यालय / महाविद्यालय का नाम"} />
            <label>{english ? "From" : "कब से"} <input required type="date" value={womenForm.FROM_DATE} onChange={(event) => setWomenForm({ ...womenForm, FROM_DATE: event.target.value })} /></label>
            <label>{english ? "To" : "कब तक"} <input required type="date" value={womenForm.TO_DATE} onChange={(event) => setWomenForm({ ...womenForm, TO_DATE: event.target.value })} /></label>
            <input required value={womenForm.MASTER_TRAINER} onChange={(event) => setWomenForm({ ...womenForm, MASTER_TRAINER: event.target.value })} placeholder={english ? "Master Trainer" : "मास्टर ट्रेनर महिला कानि."} />
            <label>13–18 <input required type="number" min="0" value={womenForm.AGE_13_18} onChange={(event) => setWomenForm({ ...womenForm, AGE_13_18: event.target.value })} /></label>
            <label>18–35 <input required type="number" min="0" value={womenForm.AGE_18_35} onChange={(event) => setWomenForm({ ...womenForm, AGE_18_35: event.target.value })} /></label>
            <label>35+ <input required type="number" min="0" value={womenForm.AGE_35_PLUS} onChange={(event) => setWomenForm({ ...womenForm, AGE_35_PLUS: event.target.value })} /></label>
            <strong>{english ? "Total Trainees" : "कुल प्रशिक्षणार्थी"}: {womenTotal}</strong>
            <button type="submit">➕ {english ? "Save Program" : "कार्यक्रम सेव करें"}</button>
          </form>
          <div className="training-table-scroll table-responsive-box">
            <table className="training-data-table">
              <thead><tr><th>{english ? "Institution" : "संस्थान"}</th><th>{english ? "From" : "कब से"}</th><th>{english ? "To" : "कब तक"}</th><th>{english ? "Trainer" : "मास्टर ट्रेनर"}</th><th>13–18</th><th>18–35</th><th>35+</th><th>{english ? "Total" : "कुल"}</th></tr></thead>
              <tbody>{currentWomenRows.map((row, index) => <tr key={`${row.INSTITUTION}-${index}`}><td><HindiText text={row.INSTITUTION} /></td><td>{formatDateOnly(row.FROM_DATE)}</td><td>{formatDateOnly(row.TO_DATE)}</td><td><HindiText text={row.MASTER_TRAINER} /></td><td>{row.AGE_13_18}</td><td>{row.AGE_18_35}</td><td>{row.AGE_35_PLUS}</td><td>{row.TOTAL}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "REPORT" && (
        <section>
          <h3>📊 {english ? "Subject-Wise & Year-Wise Report" : "विषय एवं वर्ष-वार रिपोर्ट"}</h3>
          <div className="training-filter-row">
            <label>{english ? "Year" : "वर्ष"}
              <select value={reportYear} onChange={(event) => setReportYear(event.target.value)}>
                <option value="ALL">{english ? "All Years" : "सभी वर्ष"}</option>{reportYears.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
            <label>{english ? "Post" : "पद"}
              <select value={reportRank} onChange={(event) => setReportRank(event.target.value)}>
                {["ALL", "CI", "SI", "ASI", "HC", "FC"].map((rank) => <option key={rank} value={rank}>{rank === "ALL" ? (english ? "All Posts" : "सभी पद") : rank}</option>)}
              </select>
            </label>
            <label>{english ? "Subject" : "विषय"}
              <select value={reportCourse} onChange={(event) => setReportCourse(event.target.value)}>
                <option value="ALL">{english ? "All Subjects" : "सभी विषय"}</option>
                {[...new Set(reportRows.map((row) => row.COURSE_NAME).filter(Boolean))].map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
          </div>
          <p>{english ? "Employees with pending mandatory courses" : "अपूर्ण आवश्यक प्रशिक्षण वाले कर्मचारी"}: {missingRows.filter((row) => row["अपूर्ण कोर्स"].length).length}</p>
        </section>
      )}
      {tab === "HISTORY" && category !== "IGOT" && (
        <>
          {category === "DTC" && (
            <section>
              <h3>{english ? "DTC Weekly PS-Wise Roster & Monthly Report" : "DTC साप्ताहिक थानावार रोस्टर व मासिक रिपोर्ट"}</h3>
              <label>{english ? "Report Month" : "रिपोर्ट माह"} <input type="month" value={womenMonth} onChange={(event) => setWomenMonth(event.target.value)} /></label>
              <form onSubmit={addDtcRoster} className="training-women-form">
                <label>{english ? "Week From" : "सप्ताह कब से"} <input required type="date" value={dtcForm.WEEK_FROM} onChange={(event) => setDtcForm({ ...dtcForm, WEEK_FROM: event.target.value })} /></label>
                <label>{english ? "To" : "कब तक"} <input required type="date" value={dtcForm.WEEK_TO} onChange={(event) => setDtcForm({ ...dtcForm, WEEK_TO: event.target.value })} /></label>
                <input required value={dtcForm.POLICE_STATION} onChange={(event) => setDtcForm({ ...dtcForm, POLICE_STATION: event.target.value })} placeholder={english ? "Police Station" : "थाना"} />
                <input required value={dtcForm.COURSE_NAME} onChange={(event) => setDtcForm({ ...dtcForm, COURSE_NAME: event.target.value })} placeholder={english ? "Course Subject" : "प्रशिक्षण विषय"} />
                <input required value={dtcForm.INSTRUCTOR} onChange={(event) => setDtcForm({ ...dtcForm, INSTRUCTOR: event.target.value })} placeholder={english ? "Instructor" : "प्रशिक्षक"} />
                <label>{english ? "Trainees" : "प्रशिक्षणार्थी संख्या"} <input required min="0" type="number" value={dtcForm.TRAINEES} onChange={(event) => setDtcForm({ ...dtcForm, TRAINEES: event.target.value })} /></label>
                <button type="submit">➕ {english ? "Save Weekly Roster" : "साप्ताहिक रोस्टर सेव करें"}</button>
              </form>
              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead><tr><th>{english ? "Police Station" : "थाना"}</th><th>{english ? "From" : "कब से"}</th><th>{english ? "To" : "कब तक"}</th><th>{english ? "Subject" : "विषय"}</th><th>{english ? "Instructor" : "प्रशिक्षक"}</th><th>{english ? "Trainees" : "प्रशिक्षणार्थी"}</th></tr></thead>
                  <tbody>{currentDtcRows.map((row, index) => <tr key={`${row.POLICE_STATION}-${index}`}><td><HindiText text={row.POLICE_STATION} /></td><td>{formatDateOnly(row.WEEK_FROM)}</td><td>{formatDateOnly(row.WEEK_TO)}</td><td><HindiText text={row.COURSE_NAME} /></td><td><HindiText text={row.INSTRUCTOR} /></td><td>{row.TRAINEES}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
          <h3>{english ? `Mandatory Training Check — ${filteredMissingRows.length} Employees` : `आवश्यक प्रशिक्षण रिकॉर्ड की जाँच — ${filteredMissingRows.length} कर्मचारी`}</h3>
          <div className="training-filter-row">
            <label>{english ? "Post" : "पद"}
              <select value={missingRank} onChange={(event) => { setMissingRank(event.target.value); setMissingPage(0); }}>
                {["ALL", "CI", "SI", "ASI", "HC", "FC"].map((rank) => <option key={rank} value={rank}>{rank === "ALL" ? (english ? "All Posts" : "सभी पद") : rank}</option>)}
              </select>
            </label>
            <label>{english ? "Course" : "कोर्स"}
              <select value={missingCourse} onChange={(event) => { setMissingCourse(event.target.value); setMissingPage(0); }}>
                <option value="ALL">{english ? "All Courses" : "सभी कोर्स"}</option>
                {REQUIRED_COURSES.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <div className="training-table-scroll table-responsive-box">
            <table className="training-data-table training-summary-table">
              <thead><tr><th>{english ? "S.N." : "क्र.सं."}</th><th>{english ? "Post" : "पद (Post)"}</th><th>{english ? "Belt No." : "बेल्ट नं."}</th><th>{english ? "Name" : "नाम"}</th><th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th><th>{english ? "Completed" : "पूर्ण प्रशिक्षण संख्या"}</th><th>{english ? "Pending Courses" : "लंबित आवश्यक प्रशिक्षण"}</th></tr></thead>
              <tbody>{pagedMissingRows.map((row, index) => (
                <tr key={getTrainingEmployeeKey(row.employee)}>
                  <td className="training-tnr-cell">{missingPage * pageSize + index + 1}</td>
                  <td className="training-tnr-cell">{row.CADER || "-"}</td>
                  <td className="training-tnr-cell">{isBeltRank(row.employee) ? row["BELT NO"] : "-"}</td>
                  <td><button type="button" className="training-name-button" onClick={() => {
                    setDetailEmployee(row.employee);
                    setNewCourse(REQUIRED_COURSES[0].label);
                    setNewFrom("");
                    setNewTo("");
                    setNewInstitute("");
                  }}><HindiText text={row.NAME} /></button></td>
                  <td><HindiText text={row.POSTING} /></td>
                  <td className="training-tnr-cell">{row["पूर्ण प्रशिक्षण संख्या"]}</td>
                  <td>{row["अपूर्ण कोर्स"].join(", ") || (english ? "All Completed" : "सभी आवश्यक प्रशिक्षण पूर्ण")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="training-pagination">
            <button type="button" disabled={missingPage === 0} onClick={() => setMissingPage((page) => page - 1)}>← {english ? "Prev" : "पिछला"}</button>
            <span>{english ? "Page" : "पृष्ठ"} {missingPage + 1} / {pageCount} · {Math.min(filteredMissingRows.length, missingPage * pageSize + 1)}–{Math.min(filteredMissingRows.length, (missingPage + 1) * pageSize)} / {filteredMissingRows.length}</span>
            <button type="button" disabled={missingPage + 1 >= pageCount} onClick={() => setMissingPage((page) => page + 1)}>{english ? "Next" : "अगला"} →</button>
          </div>
        </>
      )}
      {detailEmployee && (
        <div className="training-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDetailEmployee(null);
        }}>
          <section className="training-detail-modal" role="dialog" aria-modal="true" aria-labelledby="training-detail-title">
            <div className="training-heading">
              <h3 id="training-detail-title"><HindiText text={detailEmployee.NAME} /> — {english ? "Training Details" : "प्रशिक्षण विवरण"}</h3>
              <button type="button" onClick={() => setDetailEmployee(null)} aria-label="Close training details">✕</button>
            </div>
            <h4>{english ? "Completed Trainings" : "पूर्ण प्रशिक्षण"} ({detailHistory.length})</h4>
            <div className="training-table-scroll table-responsive-box">
              <table className="training-data-table">
                <thead><tr><th>{english ? "S.N." : "क्र.सं."}</th><th>{english ? "Post" : "पद"}</th><th>{english ? "Belt No." : "बेल्ट नं."}</th><th>{english ? "Name" : "नाम"}</th><th>{english ? "Course" : "कोर्स का नाम"}</th><th>{english ? "From" : "कब से"}</th><th>{english ? "To" : "कब तक"}</th><th>{english ? "Institute" : "संस्थान"}</th><th>{english ? "Order No." : "आदेश नं."}</th></tr></thead>
                <tbody>{detailHistory.map((row, index) => <tr key={`${row.COURSE_NAME}-${index}`}>
                  <td>{index + 1}</td><td>{detailEmployee.CADER || "-"}</td><td>{isBeltRank(detailEmployee) ? row["BELT NO"] : "-"}</td><td><HindiText text={detailEmployee.NAME} /></td>
                  <td><HindiText text={row.COURSE_NAME} /></td><td>{formatDateOnly(row.FROM_DATE)}</td><td>{formatDateOnly(row.TO_DATE)}</td>
                  <td><HindiText text={row.INSTITUTE} /></td><td>{row.DOB_ORDER_NO || row.ORDER_NO || "-"}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <h4>{english ? "Pending Mandatory Trainings" : "लंबित आवश्यक प्रशिक्षण"}</h4>
            {detailMissing.length ? <ul>{detailMissing.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{english ? "All mandatory trainings completed." : "सभी आवश्यक प्रशिक्षण पूर्ण हैं।"}</p>}
            <h4>{english ? "Current Nominations" : "वर्तमान नामांकन"}</h4>
            {detailPending.length ? <ul>{detailPending.map((row, index) => <li key={`${row.COURSE_NAME}-${index}`}>{row.COURSE_NAME} · {formatDateOnly(row.FROM_DATE)}–{formatDateOnly(row.TO_DATE)}</li>)}</ul> : <p>{english ? "No pending nominations." : "कोई लंबित नामांकन नहीं।"}</p>}
            <h4>➕ {english ? "Add Training" : "नया प्रशिक्षण जोड़ें"}</h4>
            <form onSubmit={addHistory} className="training-add-form">
              <input list="training-course-list" required value={newCourse} onChange={(event) => setNewCourse(event.target.value)} placeholder={english ? "Course Name" : "कोर्स का नाम"} />
              <datalist id="training-course-list">{REQUIRED_COURSES.map((item) => <option key={item.label} value={item.label} />)}</datalist>
              <label>{english ? "From" : "कब से"} <input required type="date" value={newFrom} onChange={(event) => setNewFrom(event.target.value)} /></label>
              <label>{english ? "To" : "कब तक"} <input required type="date" value={newTo} onChange={(event) => setNewTo(event.target.value)} /></label>
              <input required value={newInstitute} onChange={(event) => setNewInstitute(event.target.value)} placeholder={english ? "Institute" : "संस्थान"} />
              <button type="submit">➕ {english ? "Add Training" : "प्रशिक्षण जोड़ें"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function TrainingNominationList({ rows, onNotDone, english }) {
  return (
    <section>
      <h3>⏳ {english ? "Pending Training" : "लंबित प्रशिक्षण"} ({rows.length})</h3>
      {rows.map((row, index) => (
        <p key={`${row["BELT NO"]}-${index}`}>
          <HindiText text={row.NAME} /> · {row["BELT NO"]} · {row.COURSE_NAME} · {formatDateOnly(row.FROM_DATE)}—{formatDateOnly(row.TO_DATE)}{" "}
          <button type="button" onClick={() => onNotDone(row)}>{english ? "Mark Not Done" : "प्रशिक्षण नहीं किया"}</button>
        </p>
      ))}
      {rows.length === 0 && <p>{english ? "No pending training." : "कोई प्रशिक्षण लंबित नहीं है।"}</p>}
    </section>
  );
}
