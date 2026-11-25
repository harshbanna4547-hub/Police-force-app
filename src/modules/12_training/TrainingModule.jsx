import { useMemo, useState } from "react";
import XLSX from "xlsx-js-style";
import HindiText from "../../core/HindiText";
import ModuleHeaderToolbar from "../../components/shared/ModuleHeaderToolbar";
import { filterEmployeesByGender, matchesEmployeeSearch } from "../../forceLogic";
import { appendRowToSheet, formatDateOnly } from "../../shared/commonFunctions";
import { exportTableToExcel, exportTableToPdfOrPrint, exportTableToWord } from "../../utils/exportHelper";
import { openDriveVaultDB } from "../../utils/vaultStorage";
import { renderTrainingDocument, TRAINING_DOCUMENTS } from "./trainingTemplates";
import {
  buildCourseWiseTrainingSummary,
  buildInstituteWiseTrainingSummary,
  buildPostWiseTrainingSummary,
  buildYearWiseTrainingSummary,
  datesOverlap,
  getMandatoryPendingDueRows,
  getMissingTrainingCourses,
  getTrainingEmployeeKey,
  IN_STATE_INSTITUTES,
  isBeltRank,
  MANDATORY_DUE_COURSES,
  NOMINATION_LIFECYCLE_TABS,
  NOMINATION_SUBTABS,
  normalizeTrainingRank,
  OTHER_STATE_INSTITUTES,
  parseTrainingDate,
  POST_ORDER_LIST,
  PRIMARY_TABS,
  REQUIRED_COURSES,
  sameTrainingEmployee,
  TRAINING_SUBTABS
} from "./trainingLogic";
import "./training.css";

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

const VAULT_SUBFOLDER_LABELS = {
  OTHER_STATE: "Other State Nomination (अन्य राज्य व राष्ट्रीय संस्थान)",
  IN_STATE: "In-State Nomination (राज्य स्तरीय संस्थान)",
  IGOT: "iGOT Karmayogi (MDO Admin रिपोर्ट)",
  WOMEN_SELF_DEFENCE: "Mahila Aatma Raksha (महिला शक्ति आत्मरक्षा)",
  DTC: "District Training Center (DTC चित्तौड़गढ़)",
  HISTORY: "All Training Record (प्रशिक्षण रिकॉर्ड)"
};

// [STORAGE] Save generated training letters / reports into Storage Vault -> 09. Training
async function saveTrainingFileToVault(district, subFolderKey, fileName, html) {
  const db = await openDriveVaultDB();
  const readTx = db.transaction("drive_items", "readonly");
  const existing = await new Promise((resolve, reject) => {
    const request = readTx.objectStore("drive_items").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const rootName = "09. Training (प्रशिक्षण पत्र एवं बेतार संदेश)";
  const subFolderName = VAULT_SUBFOLDER_LABELS[subFolderKey] || subFolderKey;
  const data = await new Blob(["\ufeff", html], { type: "text/html;charset=utf-8" }).arrayBuffer();

  let root = existing.find((item) => item.parentId === "ROOT" && item.kind === "FOLDER" && item.name === rootName && item.district === district);
  const tx = db.transaction("drive_items", "readwrite");
  const store = tx.objectStore("drive_items");
  if (!root) {
    root = { id: `training_${Date.now()}`, parentId: "ROOT", kind: "FOLDER", name: rootName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(root);
  }
  let categoryFolder = existing.find((item) => item.parentId === root.id && item.kind === "FOLDER" && item.name === subFolderName && item.district === district);
  if (!categoryFolder) {
    categoryFolder = { id: `training_cat_${Date.now()}`, parentId: root.id, kind: "FOLDER", name: subFolderName, district, updatedAt: new Date().toLocaleDateString("en-IN") };
    store.put(categoryFolder);
  }
  store.put({
    id: `training_file_${Date.now()}`,
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

function openOrDownloadHtml(html, fileName, shouldPrint = false) {
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

/**
 * [COMPONENT] TrainingModule — 2 मुख्य टैब (1. Training रिकॉर्ड + 2. Nomination आदेश) एवं 10 सब-टैब्स
 */
export default function TrainingModule({ records = [], allSheets = {}, setAllSheets, activeProfile = "District", language = "hi" }) {
  const english = language === "en";
  const [lookbackCutoff] = useState(() => Date.now() - TWO_YEARS_MS);

  // [NAVIGATION] Primary, Sub-Tab & 4-Stage Nomination Lifecycle State
  const [primaryTab, setPrimaryTab] = useState("TRAINING");
  const [trainingSubTab, setTrainingSubTab] = useState("ALL_RECORDS");
  const [nominationSubTab, setNominationSubTab] = useState("OTHER_STATE");
  const [nominationStage, setNominationStage] = useState("GENERATOR");

  // [FILTERS] Global Search & Gender
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("ALL");

  // [TRAINING TAB 1-6 STATE]
  const [rankFilter, setRankFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [dueRankFilter, setDueRankFilter] = useState("ALL");
  const [dueCourseFilter, setDueCourseFilter] = useState("ALL");
  const [duePage, setDuePage] = useState(0);
  const [selectedPostRank, setSelectedPostRank] = useState("FC");
  const [selectedCourseName, setSelectedCourseName] = useState("PCC");
  const [selectedInstituteName, setSelectedInstituteName] = useState("RPA जयपुर");
  const [yearMode, setYearMode] = useState("CALENDAR");
  const [selectedYearPeriod, setSelectedYearPeriod] = useState(String(new Date().getFullYear()));
  const [detailEmployee, setDetailEmployee] = useState(null);
  const [newCourse, setNewCourse] = useState(REQUIRED_COURSES[0].label);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newInstitute, setNewInstitute] = useState("");

  // [NOMINATION GENERATOR STATE]
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employee, setEmployee] = useState(null);
  const [course, setCourse] = useState("");
  const [institute, setInstitute] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [documentType, setDocumentType] = useState("WIRELESS");
  const [documentInstructions, setDocumentInstructions] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [saving, setSaving] = useState(false);

  // [IGOT, WOMEN & DTC STATE]
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [womenForm, setWomenForm] = useState({
    INSTITUTION: "", FROM_DATE: "", TO_DATE: "", MASTER_TRAINER: "",
    AGE_13_18: "", AGE_18_35: "", AGE_35_PLUS: ""
  });
  const [dtcForm, setDtcForm] = useState({
    WEEK_FROM: "", WEEK_TO: "", POLICE_STATION: "", COURSE_NAME: "", INSTRUCTOR: "", TRAINEES: ""
  });

  const history = useMemo(() => allSheets.Training_History || [], [allSheets]);
  const nominations = useMemo(() => allSheets.Training_Nominations || [], [allSheets]);
  const igotRows = useMemo(() => allSheets.Training_iGOT || [], [allSheets]);
  const womenRows = useMemo(() => allSheets.Training_Women_Programs || [], [allSheets]);
  const dtcRows = useMemo(() => allSheets.Training_DTC_Roster || [], [allSheets]);

  // [FILTER] Gender-filtered master force
  const genderFilteredRecords = useMemo(
    () => filterEmployeesByGender(records, gender),
    [records, gender]
  );

  // [TRAINING SUB-TAB 1] Consolidated Employee-Wise Summary (1 Employee = 1 Row)
  const missingRows = useMemo(
    () => getMissingTrainingCourses(genderFilteredRecords, history),
    [genderFilteredRecords, history]
  );

  const filteredMissingRows = missingRows.filter((row) => {
    if (rankFilter !== "ALL" && normalizeTrainingRank(row.employee) !== rankFilter) return false;
    if (courseFilter !== "ALL" && !row["अपूर्ण कोर्स"].includes(courseFilter)) return false;
    const q = search.trim();
    return !q || matchesEmployeeSearch(row, q, ["NAME", "BELT NO", "CADER", "POSTING"]);
  });

  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filteredMissingRows.length / pageSize));
  const pagedMissingRows = filteredMissingRows.slice(page * pageSize, (page + 1) * pageSize);

  // [TRAINING SUB-TAB 6] Mandatory / Pending Due (PCC for FC/HC only + BNS/BNSS/BSA + Cyber + Induction)
  const mandatoryDueRows = useMemo(
    () => getMandatoryPendingDueRows(genderFilteredRecords, history),
    [genderFilteredRecords, history]
  );

  const filteredDueRows = mandatoryDueRows.filter((row) => {
    if (dueRankFilter !== "ALL" && normalizeTrainingRank(row.employee) !== dueRankFilter) return false;
    if (dueCourseFilter !== "ALL" && !row["लंबित अनिवार्य कोर्स"].includes(dueCourseFilter)) return false;
    const q = search.trim();
    return !q || matchesEmployeeSearch(row, q, ["NAME", "BELT NO", "CADER", "POSTING"]);
  });

  const duePageCount = Math.max(1, Math.ceil(filteredDueRows.length / pageSize));
  const pagedDueRows = filteredDueRows.slice(duePage * pageSize, (duePage + 1) * pageSize);

  // [TRAINING SUB-TAB 2-5] Aggregated Reports
  const postWiseSummary = useMemo(
    () => buildPostWiseTrainingSummary(genderFilteredRecords, history),
    [genderFilteredRecords, history]
  );
  const courseWiseSummary = useMemo(
    () => buildCourseWiseTrainingSummary(genderFilteredRecords, history),
    [genderFilteredRecords, history]
  );
  const instituteWiseSummary = useMemo(
    () => buildInstituteWiseTrainingSummary(history),
    [history]
  );
  const yearWiseSummary = useMemo(
    () => buildYearWiseTrainingSummary(history, yearMode, 2020),
    [history, yearMode]
  );

  const activePostGroup = postWiseSummary.find((item) => item.rank === selectedPostRank) || postWiseSummary[0];
  const activeCourseGroup = courseWiseSummary.find((item) => item.course === selectedCourseName) || courseWiseSummary[0];
  const activeInstituteGroup = instituteWiseSummary.find((item) => item.institute === selectedInstituteName) || instituteWiseSummary[0];
  const activeYearGroup = yearWiseSummary.find((item) => item.period === selectedYearPeriod) || yearWiseSummary[0];

  // [DETAIL MODAL] Employee Training History & Add Training Handler
  const detailHistory = detailEmployee ? history.filter((row) => sameTrainingEmployee(detailEmployee, row)) : [];
  const detailMissing = detailEmployee
    ? missingRows.find((row) => sameTrainingEmployee(row.employee, detailEmployee))?.["अपूर्ण कोर्स"] || []
    : [];
  const detailPending = detailEmployee
    ? nominations.filter((row) => row.STATUS === "PENDING" && sameTrainingEmployee(row, detailEmployee))
    : [];

  const handleAddHistory = async (event) => {
    event.preventDefault();
    if (!detailEmployee) return;
    const employeeBelt = detailEmployee["BELT NO"] || detailEmployee["BELT NO."] || "";
    const row = {
      "BELT NO": String(employeeBelt || "").toUpperCase(),
      NAME: detailEmployee.NAME || "",
      COURSE_NAME: newCourse,
      FROM_DATE: newFrom,
      TO_DATE: newTo,
      INSTITUTE: newInstitute,
      CATEGORY: "HISTORY",
      STATUS: "COMPLETED",
      CADER: detailEmployee.CADER || "",
      _uid: detailEmployee._uid
    };
    const recordHtml = renderTrainingDocument("WIRELESS", {
      ...row,
      "FATHER NAME": detailEmployee["FATHER NAME"],
      POSTING: detailEmployee.POSTING,
      MOBILE: detailEmployee["MOBILE NO 1"] || detailEmployee["MOBILE NO"],
      EMAIL: detailEmployee.EMAIL,
      EDUCATION: detailEmployee.EDUCATION,
      DOB: detailEmployee["DATE OF BIRTH"]
    });
    try {
      await saveTrainingFileToVault(activeProfile, "HISTORY", `Training_History_${Date.now()}.html`, recordHtml);
      appendRowToSheet(setAllSheets, "Training_History", row, { prepend: false });
    } catch (error) {
      window.alert(`प्रशिक्षण रिकॉर्ड Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
      return;
    }
    setNewFrom("");
    setNewTo("");
    setNewInstitute("");
    setNewCourse(REQUIRED_COURSES[0].label);
    setDetailEmployee(null);
  };

  // [NOMINATION SUB-TAB 1 & 2] Employee Match, 2-Year History & Clash Detection
  const employeeMatches = useMemo(() => {
    const q = employeeQuery.trim();
    if (!q) return [];
    return genderFilteredRecords
      .filter((row) => matchesEmployeeSearch(row, q, ["NAME", "BELT NO", "CADER", "POSTING"]))
      .slice(0, 10);
  }, [genderFilteredRecords, employeeQuery]);

  const employeeHistory = employee ? history.filter((row) => sameTrainingEmployee(employee, row)) : [];
  const recentHistory = employeeHistory.filter((row) => {
    const ts = parseTrainingDate(row.TO_DATE || row.FROM_DATE);
    return Number.isFinite(ts) && ts >= lookbackCutoff;
  });

  const normalizedCourse = String(course || "").trim().toLocaleLowerCase();
  const requiredCourseMatch = REQUIRED_COURSES.find((item) =>
    item.label.toLocaleLowerCase() === normalizedCourse ||
    item.aliases.some((alias) => alias.toLocaleLowerCase() === normalizedCourse)
  );
  const courseAliases = requiredCourseMatch
    ? requiredCourseMatch.aliases.map((alias) => alias.toLocaleLowerCase())
    : [normalizedCourse];

  const alreadyCompleted = Boolean(normalizedCourse) && employeeHistory.some((row) =>
    courseAliases.some((alias) => alias && String(row.COURSE_NAME || "").toLocaleLowerCase().includes(alias))
  );
  const invalidTrainingRange = Number.isFinite(parseTrainingDate(fromDate)) &&
    Number.isFinite(parseTrainingDate(toDate)) && parseTrainingDate(fromDate) > parseTrainingDate(toDate);
  const dateClash = Boolean(employee) && nominations.some((row) =>
    row.STATUS === "PENDING" &&
    sameTrainingEmployee(employee, row) &&
    datesOverlap(fromDate, toDate, row.FROM_DATE, row.TO_DATE)
  );

  const isNominationFormTab = nominationSubTab === "OTHER_STATE" || nominationSubTab === "IN_STATE";
  const categoryNominations = nominations.filter((row) =>
    row.CATEGORY === nominationSubTab ||
    (nominationSubTab === "OTHER_STATE" && row.CATEGORY === "NATIONAL") ||
    (nominationSubTab === "IN_STATE" && ["STATE", "RPTC", "HCM_RIPA"].includes(row.CATEGORY))
  );
  const pendingNominations = categoryNominations.filter((row) => row.STATUS === "PENDING");
  const completedNominations = categoryNominations.filter((row) => row.STATUS === "COMPLETED");
  const notDoneNominations = categoryNominations.filter((row) => row.STATUS === "NOT_DONE");

  const makeNominationPayload = () => {
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
      INSTITUTE: institute.trim(),
      FROM_DATE: fromDate,
      TO_DATE: toDate,
      CATEGORY: nominationSubTab,
      STATUS: "PENDING",
      NOMINATED_AT: new Date().toISOString().slice(0, 10),
      _uid: employee._uid
    };
  };

  const handleGenerateNomination = async (event) => {
    event.preventDefault();
    if (!employee || !course.trim() || !institute.trim() || invalidTrainingRange) return;
    if (documentType === "WIRELESS" && (alreadyCompleted || dateClash)) return;

    setSaving(true);
    const nomination = makeNominationPayload();
    const html = renderTrainingDocument(documentType, nomination, documentInstructions);
    const safeCourse = course.replace(/[^\w-]+/g, "_") || "Training";
    const fileName = `${String(nomination["BELT NO"] || "Employee")}_${documentType}_${safeCourse}_${Date.now()}.html`;
    try {
      await saveTrainingFileToVault(activeProfile, nominationSubTab, fileName, html);
      if (documentType === "WIRELESS" || documentType === "DISPATCH") {
        setAllSheets((prev) => ({
          ...prev,
          Training_Nominations: [...(prev.Training_Nominations || []), nomination]
        }));
        setNominationStage("PENDING");
      }
      openOrDownloadHtml(html, fileName, documentType !== "WIRELESS");
      setEmployee(null);
      setEmployeeQuery("");
      setCourse("");
      setFromDate("");
      setToDate("");
      setDocumentInstructions("");
    } catch (error) {
      window.alert(`नामांकन आदेश Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeTraining = (nomination) => {
    if (!orderNo.trim() || !orderDate) {
      window.alert(english ? "DOB Order No. and Date are required." : "प्रशिक्षण पूर्ण करने के लिए DOB आदेश संख्या और दिनांक आवश्यक हैं।");
      return;
    }
    const completed = { ...nomination, STATUS: "COMPLETED", DOB_ORDER_NO: orderNo.trim(), DOB_ORDER_DATE: orderDate };
    const { NAME: empName, "BELT NO": empBelt, ...rest } = completed;
    setAllSheets((prev) => ({
      ...prev,
      Training_Nominations: (prev.Training_Nominations || []).map((row) => row === nomination ? completed : row),
      Training_History: [...(prev.Training_History || []), { ...rest, NAME: empName, "BELT NO": empBelt }]
    }));
    setOrderNo("");
    setOrderDate("");
  };

  const markNotDone = (nomination) => {
    const reason = window.prompt(english ? "Enter reason for Not Done:" : "प्रशिक्षण न कर पाने का कारण लिखें:");
    if (!reason?.trim()) return;
    setAllSheets((prev) => ({
      ...prev,
      Training_Nominations: (prev.Training_Nominations || []).map((row) =>
        row === nomination ? { ...row, STATUS: "NOT_DONE", NOT_DONE_REASON: reason.trim() } : row
      )
    }));
  };

  // [IGOT KARMAYOGI STATE & HANDLERS]
  const uniqueRecords = useMemo(
    () => [...new Map(genderFilteredRecords.map((record) => [getTrainingEmployeeKey(record), record])).values()],
    [genderFilteredRecords]
  );

  const igotData = uniqueRecords
    .filter((record) => !search.trim() || matchesEmployeeSearch(record, search, ["NAME", "BELT NO", "CADER", "POSTING", "SSO_ID"]))
    .map((record, index) => {
      const beltNo = record["BELT NO"] || record["BELT NO."] || "";
      const tracking = igotRows.find((row) => sameTrainingEmployee(row, record)) || {};
      return {
        "S.N.": index + 1,
        Post: record.CADER || "",
        "Belt No.": isBeltRank(record) ? beltNo : "-",
        Name: record.NAME || "",
        Posting: record.POSTING || "",
        "SSO ID": tracking.SSO_ID || record.SSO_ID || record.SSOID || "",
        Mobile: record["MOBILE NO 1"] || record["MOBILE NO"] || "",
        Registered: String(tracking.REGISTERED || "No").toLowerCase() === "yes" ? "Yes" : "No",
        "AI Courses": Number(tracking.AI_COURSES || 0),
        "Other Courses": Number(tracking.OTHER_COURSES || 0),
        _key: getTrainingEmployeeKey(record),
        _record: record
      };
    });

  const registeredCount = igotData.filter((row) => row.Registered === "Yes").length;
  const igotCompletedCount = igotData.filter((row) => row["AI Courses"] + row["Other Courses"] > 0).length;

  const updateIgot = (record, field, value) => {
    setAllSheets((prev) => {
      const current = prev.Training_iGOT || [];
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
        ...prev,
        Training_iGOT: existing
          ? current.map((row) => sameTrainingEmployee(row, record) ? next : row)
          : [...current, next]
      };
    });
  };

  const exportIgotExcel = async () => {
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
    XLSX.writeFile(book, `MDO_Admin_iGOT_${reportMonth || "Report"}.xlsx`);
    const summaryHtml = `<h2>MDO Admin iGOT Karmayogi Snapshot (${reportMonth || "All"})</h2><p>Total: ${igotData.length} | Registered: ${registeredCount} | Completed: ${igotCompletedCount}</p>`;
    await saveTrainingFileToVault(activeProfile, "IGOT", `MDO_Admin_iGOT_${reportMonth || Date.now()}.html`, summaryHtml).catch(() => {});
  };

  // [WOMEN SELF-DEFENCE & DTC HANDLERS]
  const currentWomenRows = womenRows.filter((row) => !reportMonth || String(row.FROM_DATE || "").slice(0, 7) === reportMonth);
  const womenTotal = ["AGE_13_18", "AGE_18_35", "AGE_35_PLUS"].reduce((total, key) => total + Number(womenForm[key] || 0), 0);

  const addWomenProgram = async (event) => {
    event.preventDefault();
    const row = { ...womenForm, TOTAL: womenTotal, CATEGORY: "WOMEN_SELF_DEFENCE", CREATED_AT: new Date().toISOString() };
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
      await saveTrainingFileToVault(activeProfile, "WOMEN_SELF_DEFENCE", `Mahila_Aatma_Raksha_${Date.now()}.html`, reportHtml);
      setAllSheets((prev) => ({
        ...prev,
        Training_Women_Programs: [...(prev.Training_Women_Programs || []), row]
      }));
      setWomenForm({ INSTITUTION: "", FROM_DATE: "", TO_DATE: "", MASTER_TRAINER: "", AGE_13_18: "", AGE_18_35: "", AGE_35_PLUS: "" });
    } catch (error) {
      window.alert(`महिला शक्ति रिपोर्ट Storage Vault में सुरक्षित नहीं हो सकी: ${error.message}`);
    }
  };

  const womenMonthlyExportRows = currentWomenRows.map((row, index) => ({
    "क्र.सं.": index + 1,
    "विद्यालय / महाविद्यालय": row.INSTITUTION,
    "दिनांक से": formatDateOnly(row.FROM_DATE),
    "दिनांक तक": formatDateOnly(row.TO_DATE),
    "मास्टर ट्रेनर": row.MASTER_TRAINER,
    "13-18 वर्ष": row.AGE_13_18,
    "18-35 वर्ष": row.AGE_18_35,
    "35+ वर्ष": row.AGE_35_PLUS,
    "कुल प्रशिक्षणार्थी": row.TOTAL
  }));

  const currentDtcRows = dtcRows.filter((row) => !reportMonth || String(row.WEEK_FROM || "").slice(0, 7) === reportMonth);
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
      await saveTrainingFileToVault(activeProfile, "DTC", `DTC_Weekly_${Date.now()}.html`, reportHtml);
      setAllSheets((prev) => ({
        ...prev,
        Training_DTC_Roster: [...(prev.Training_DTC_Roster || []), row]
      }));
      setDtcForm({ WEEK_FROM: "", WEEK_TO: "", POLICE_STATION: "", COURSE_NAME: "", INSTRUCTOR: "", TRAINEES: "" });
    } catch (error) {
      window.alert(`DTC रोस्टर Storage Vault में सुरक्षित नहीं हो सका: ${error.message}`);
    }
  };

  // [TOP TOOLBAR EXPORT ROWS] Automatically matches active sub-tab
  const toolbarExportRows = (() => {
    if (primaryTab === "TRAINING") {
      if (trainingSubTab === "POST_WISE") {
        return postWiseSummary.map((row) => ({
          "पद (Post)": row.label,
          "कुल बल": row.totalForce,
          "प्रशिक्षित": row.trainedCount,
          "लंबित": row.pendingCount
        }));
      }
      if (trainingSubTab === "COURSE_WISE") {
        return courseWiseSummary.map((row) => ({
          "कोर्स / प्रशिक्षण": row.course,
          "लक्ष्य बल": row.applicableTotal,
          "पूर्ण": row.completedCount,
          "शेष": row.remainingCount
        }));
      }
      if (trainingSubTab === "INSTITUTE_WISE") {
        return instituteWiseSummary.map((row) => ({
          "संस्थान": row.institute,
          "पूर्ण प्रशिक्षण संख्या": row.completedCount
        }));
      }
      if (trainingSubTab === "YEAR_WISE") {
        return yearWiseSummary.map((row) => ({
          "वर्ष / वित्तीय वर्ष": row.period,
          "पूर्ण प्रशिक्षण संख्या": row.completedCount,
          "प्रशिक्षित कार्मिक": row.uniqueEmployees,
          "प्रमुख विषय": row.coursesSummary
        }));
      }
      if (trainingSubTab === "MANDATORY_DUE") {
        return filteredDueRows.map((row, index) => ({
          "क्र.सं.": index + 1,
          "पद (Post)": row.CADER,
          "बेल्ट नं.": isBeltRank(row.employee) ? row["BELT NO"] : "-",
          "नाम": row.NAME,
          "वर्तमान पदस्थापन": row.POSTING,
          "पूर्ण प्रशिक्षण संख्या": row["पूर्ण प्रशिक्षण संख्या"],
          "लंबित अनिवार्य कोर्स": row["लंबित अनिवार्य कोर्स"].join(", ")
        }));
      }
      return filteredMissingRows.map((row, index) => ({
        "क्र.सं.": index + 1,
        "पद (Post)": row.CADER,
        "बेल्ट नं.": isBeltRank(row.employee) ? row["BELT NO"] : "-",
        "नाम": row.NAME,
        "वर्तमान पदस्थापन": row.POSTING,
        "पूर्ण प्रशिक्षण संख्या": row["पूर्ण प्रशिक्षण संख्या"],
        "लंबित आवश्यक प्रशिक्षण": row["अपूर्ण कोर्स"].join(", ")
      }));
    }

    if (nominationSubTab === "IGOT") return igotData;
    if (nominationSubTab === "WOMEN_SELF_DEFENCE") return womenMonthlyExportRows;
    if (nominationSubTab === "DTC") {
      return currentDtcRows.map((row, i) => ({
        "क्र.सं.": i + 1,
        "थाना / कार्यालय": row.POLICE_STATION,
        "सप्ताह से": formatDateOnly(row.WEEK_FROM),
        "सप्ताह तक": formatDateOnly(row.WEEK_TO),
        "विषय": row.COURSE_NAME,
        "प्रशिक्षक": row.INSTRUCTOR,
        "प्रशिक्षणार्थी संख्या": row.TRAINEES
      }));
    }
    return categoryNominations.map((row, i) => ({
      "क्र.सं.": i + 1,
      "बेल्ट नं.": row["BELT NO"],
      "नाम": row.NAME,
      "कोर्स": row.COURSE_NAME,
      "संस्थान": row.INSTITUTE,
      "कब से": formatDateOnly(row.FROM_DATE),
      "कब तक": formatDateOnly(row.TO_DATE),
      "स्थिति": row.STATUS
    }));
  })();

  return (
    <div className="training-module">
      {/* === TOP UNIFIED MODULE HEADER TOOLBAR === */}
      <ModuleHeaderToolbar
        title={english ? "🎓 Training & Nomination Management" : "🎓 प्रशिक्षण एवं नामांकन प्रबंधन"}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        gender={gender}
        onGenderChange={(val) => {
          setGender(val);
          setPage(0);
        }}
        rows={toolbarExportRows}
        fileName={`Training_${primaryTab}_${primaryTab === "TRAINING" ? trainingSubTab : nominationSubTab}`}
        language={language}
      />

      {/* === PRIMARY 2 TABS: 1. TRAINING | 2. NOMINATION === */}
      <nav className="training-primary-tabs" aria-label={english ? "Training primary tabs" : "प्रशिक्षण मुख्य टैब"}>
        {PRIMARY_TABS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setPrimaryTab(item.id)}
            className={`training-primary-tab ${primaryTab === item.id ? "is-active" : ""}`}
            aria-pressed={primaryTab === item.id}
          >
            {english ? item.en : item.hi}
          </button>
        ))}
      </nav>

      {/* =====================================================================
          PRIMARY TAB 1: TRAINING RECORDS (5 SUB-TABS)
         ===================================================================== */}
      {primaryTab === "TRAINING" && (
        <>
          <nav className="training-subtabs" aria-label={english ? "Training record sub-tabs" : "प्रशिक्षण रिकॉर्ड उप-टैब"}>
            {TRAINING_SUBTABS.map((sub) => (
              <button
                type="button"
                key={sub.id}
                onClick={() => setTrainingSubTab(sub.id)}
                className={`training-subtab-btn ${trainingSubTab === sub.id ? "is-active" : ""}`}
                aria-pressed={trainingSubTab === sub.id}
              >
                {english ? sub.en : sub.hi}
              </button>
            ))}
          </nav>

          {/* --- 1.1 ALL TRAINING RECORD (1 Employee = 1 Row + Popup Detail) --- */}
          {trainingSubTab === "ALL_RECORDS" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  📋 {english ? `All Training Record (${filteredMissingRows.length} Employees)` : `समेकित कर्मचारी-वार प्रशिक्षण रिकॉर्ड (${filteredMissingRows.length} कर्मचारी)`}
                </h3>
              </div>
              <div className="training-filter-row">
                <label>
                  {english ? "Post / Rank" : "पद / रैंक"}
                  <select value={rankFilter} onChange={(e) => { setRankFilter(e.target.value); setPage(0); }}>
                    <option value="ALL">{english ? "All Posts" : "सभी पद (ALL)"}</option>
                    {POST_ORDER_LIST.map((r) => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {english ? "Pending Course" : "लंबित आवश्यक कोर्स"}
                  <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(0); }}>
                    <option value="ALL">{english ? "All Courses" : "सभी कोर्स"}</option>
                    {REQUIRED_COURSES.map((item) => (
                      <option key={item.label} value={item.label}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "S.N." : "क्र.सं."}</th>
                      <th>{english ? "Post" : "पद"}</th>
                      <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                      <th>{english ? "Name" : "नाम"}</th>
                      <th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th>
                      <th>{english ? "Completed" : "पूर्ण प्रशिक्षण संख्या"}</th>
                      <th>{english ? "Pending Mandatory" : "लंबित आवश्यक प्रशिक्षण"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMissingRows.map((row, index) => (
                      <tr key={getTrainingEmployeeKey(row.employee)}>
                        <td className="training-tnr-cell">{page * pageSize + index + 1}</td>
                        <td className="training-tnr-cell">{row.CADER || "-"}</td>
                        <td className="training-tnr-cell">{isBeltRank(row.employee) ? row["BELT NO"] : "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="training-name-button"
                            onClick={() => {
                              setDetailEmployee(row.employee);
                              setNewCourse(REQUIRED_COURSES[0].label);
                              setNewFrom("");
                              setNewTo("");
                              setNewInstitute("");
                            }}
                          >
                            <HindiText text={row.NAME} />
                          </button>
                        </td>
                        <td><HindiText text={row.POSTING} /></td>
                        <td className="training-tnr-cell">{row["पूर्ण प्रशिक्षण संख्या"]}</td>
                        <td>{row["अपूर्ण कोर्स"].join(", ") || (english ? "All Completed" : "सभी आवश्यक प्रशिक्षण पूर्ण")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="training-pagination">
                <button type="button" className="training-btn-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  ← {english ? "Prev" : "पिछला"}
                </button>
                <span className="english-cell">
                  {english ? "Page" : "पृष्ठ"} {page + 1} / {pageCount} · {filteredMissingRows.length ? page * pageSize + 1 : 0}–{Math.min(filteredMissingRows.length, (page + 1) * pageSize)} / {filteredMissingRows.length}
                </span>
                <button type="button" className="training-btn-secondary" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  {english ? "Next" : "अगला"} →
                </button>
              </div>
            </section>
          )}

          {/* --- 1.2 POST-WISE RECORD (ASP, DySP, CI, SI, ASI, HC, FC) --- */}
          {trainingSubTab === "POST_WISE" && (
            <section className="training-section">
              <h3 className="training-section-title">
                🎖️ {english ? "Post-Wise Training Summary" : "पदवार प्रशिक्षण रिपोर्ट (ASP से FC तक)"}
              </h3>
              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "Post / Rank" : "पद"}</th>
                      <th>{english ? "Total Force" : "कुल कार्यरत बल"}</th>
                      <th>{english ? "Trained Employees" : "प्रशिक्षित कर्मचारी"}</th>
                      <th>{english ? "Pending Employees" : "लंबित कर्मचारी"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postWiseSummary.map((row) => (
                      <tr key={row.rank}>
                        <td>
                          <button type="button" className="training-name-button" onClick={() => setSelectedPostRank(row.rank)}>
                            {row.label}
                          </button>
                        </td>
                        <td className="training-tnr-cell">{row.totalForce}</td>
                        <td className="training-tnr-cell">{row.trainedCount}</td>
                        <td className="training-tnr-cell">{row.pendingCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activePostGroup && (
                <div className="training-drilldown-card">
                  <h4>
                    {activePostGroup.label} — {english ? `Trained (${activePostGroup.trainedCount}) / Pending (${activePostGroup.pendingCount})` : `प्रशिक्षित (${activePostGroup.trainedCount}) / लंबित (${activePostGroup.pendingCount})`}
                  </h4>
                  <div className="training-match-pills">
                    {activePostGroup.employees.slice(0, 60).map((emp) => (
                      <button
                        type="button"
                        key={getTrainingEmployeeKey(emp)}
                        className="training-match-pill"
                        onClick={() => setDetailEmployee(emp)}
                      >
                        <HindiText text={emp.NAME} /> · {isBeltRank(emp) ? emp["BELT NO"] || "-" : emp.CADER}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* --- 1.3 TRAINING / COURSE-WISE RECORD --- */}
          {trainingSubTab === "COURSE_WISE" && (
            <section className="training-section">
              <h3 className="training-section-title">
                📚 {english ? "Training / Course-Wise Record" : "कोर्स / प्रशिक्षण-वार रिपोर्ट (पूर्ण एवं शेष)"}
              </h3>
              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "Course Name" : "प्रशिक्षण कोर्स"}</th>
                      <th>{english ? "Applicable Force" : "कुल लक्षित बल"}</th>
                      <th>{english ? "Completed" : "पूर्ण कर्मचारी"}</th>
                      <th>{english ? "Remaining" : "शेष कर्मचारी"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseWiseSummary.map((row) => (
                      <tr key={row.course}>
                        <td>
                          <button type="button" className="training-name-button" onClick={() => setSelectedCourseName(row.course)}>
                            {row.course}
                          </button>
                        </td>
                        <td className="training-tnr-cell">{row.applicableTotal}</td>
                        <td className="training-tnr-cell">{row.completedCount}</td>
                        <td className="training-tnr-cell">{row.remainingCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeCourseGroup && (
                <div className="training-drilldown-card">
                  <h4>{activeCourseGroup.course} — {english ? `Completed Entries (${activeCourseGroup.completedRows.length})` : `पूर्ण प्रविष्टियाँ (${activeCourseGroup.completedRows.length})`}</h4>
                  <div className="training-match-pills">
                    {activeCourseGroup.remainingEmployees.slice(0, 30).map((emp) => (
                      <button
                        type="button"
                        key={getTrainingEmployeeKey(emp)}
                        className="training-match-pill"
                        onClick={() => setDetailEmployee(emp)}
                      >
                        ⏳ <HindiText text={emp.NAME} /> ({emp.CADER})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* --- 1.4 INSTITUTE-WISE RECORD --- */}
          {trainingSubTab === "INSTITUTE_WISE" && (
            <section className="training-section">
              <h3 className="training-section-title">
                🏛️ {english ? "Training Institute-Wise Record" : "प्रशिक्षण संस्थान-वार रिकॉर्ड"}
              </h3>
              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "S.N." : "क्र.सं."}</th>
                      <th>{english ? "Training Institute" : "प्रशिक्षण संस्थान का नाम"}</th>
                      <th>{english ? "Completed Count" : "पूर्ण प्रशिक्षण संख्या"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instituteWiseSummary.map((row, idx) => (
                      <tr key={row.institute}>
                        <td className="training-tnr-cell">{idx + 1}</td>
                        <td>
                          <button type="button" className="training-name-button" onClick={() => setSelectedInstituteName(row.institute)}>
                            {row.institute}
                          </button>
                        </td>
                        <td className="training-tnr-cell">{row.completedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeInstituteGroup && (
                <div className="training-drilldown-card">
                  <h4>{activeInstituteGroup.institute} ({activeInstituteGroup.completedCount})</h4>
                  {activeInstituteGroup.rows.length === 0 ? (
                    <p>{english ? "No records logged for this institute yet." : "इस संस्थान हेतु अभी कोई पूर्ण रिकॉर्ड दर्ज नहीं है।"}</p>
                  ) : (
                    <div className="training-table-scroll">
                      <table className="training-data-table">
                        <thead>
                          <tr>
                            <th>{english ? "Name" : "नाम"}</th>
                            <th>{english ? "Post" : "पद"}</th>
                            <th>{english ? "Course" : "कोर्स"}</th>
                            <th>{english ? "From" : "कब से"}</th>
                            <th>{english ? "To" : "कब तक"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInstituteGroup.rows.map((r, i) => (
                            <tr key={`${r.NAME}-${i}`}>
                              <td><HindiText text={r.NAME} /></td>
                              <td className="training-tnr-cell">{r.CADER || "-"}</td>
                              <td><HindiText text={r.COURSE_NAME} /></td>
                              <td className="training-tnr-cell">{formatDateOnly(r.FROM_DATE)}</td>
                              <td className="training-tnr-cell">{formatDateOnly(r.TO_DATE)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* --- 1.5 YEAR-WISE RECORD (2020 to Current Year) --- */}
          {trainingSubTab === "YEAR_WISE" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  📅 {english ? "Year-Wise Training Report (2020 – Present)" : "वर्षवार प्रशिक्षण रिपोर्ट (2020 से वर्तमान वर्ष तक)"}
                </h3>
                <div className="training-action-bar">
                  <button
                    type="button"
                    className={`training-subtab-btn ${yearMode === "CALENDAR" ? "is-active" : ""}`}
                    onClick={() => {
                      setYearMode("CALENDAR");
                      setSelectedYearPeriod(String(new Date().getFullYear()));
                    }}
                  >
                    {english ? "Calendar Year" : "कैलेंडर वर्ष"}
                  </button>
                  <button
                    type="button"
                    className={`training-subtab-btn ${yearMode === "FY" ? "is-active" : ""}`}
                    onClick={() => {
                      const yr = new Date().getFullYear();
                      setYearMode("FY");
                      setSelectedYearPeriod(`${yr}-${String(yr + 1).slice(-2)}`);
                    }}
                  >
                    {english ? "Financial Year" : "वित्तीय वर्ष (FY)"}
                  </button>
                </div>
              </div>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{yearMode === "FY" ? (english ? "Financial Year" : "वित्तीय वर्ष") : (english ? "Year" : "वर्ष")}</th>
                      <th>{english ? "Total Trainings" : "कुल प्रशिक्षण"}</th>
                      <th>{english ? "Unique Personnel" : "प्रशिक्षित कार्मिक"}</th>
                      <th>{english ? "Courses Conducted" : "प्रमुख प्रशिक्षण विषय"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearWiseSummary.map((row) => (
                      <tr key={row.period}>
                        <td>
                          <button type="button" className="training-name-button training-tnr-cell" onClick={() => setSelectedYearPeriod(row.period)}>
                            {row.period}
                          </button>
                        </td>
                        <td className="training-tnr-cell">{row.completedCount}</td>
                        <td className="training-tnr-cell">{row.uniqueEmployees}</td>
                        <td><HindiText text={row.coursesSummary} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeYearGroup && (
                <div className="training-drilldown-card">
                  <h4>{activeYearGroup.period} — {activeYearGroup.completedCount} {english ? "Trainings" : "प्रशिक्षण प्रविष्टियाँ"}</h4>
                  {activeYearGroup.rows.length === 0 ? (
                    <p>{english ? "No training entries in this period." : "इस वर्ष में कोई प्रशिक्षण प्रविष्टि नहीं है।"}</p>
                  ) : (
                    <div className="training-table-scroll">
                      <table className="training-data-table">
                        <thead>
                          <tr>
                            <th>{english ? "Name" : "नाम"}</th>
                            <th>{english ? "Course" : "विषय"}</th>
                            <th>{english ? "Institute" : "संस्थान"}</th>
                            <th>{english ? "Dates" : "तिथि"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeYearGroup.rows.map((r, i) => (
                            <tr key={`${r.NAME}-${i}`}>
                              <td><HindiText text={r.NAME} /></td>
                              <td><HindiText text={r.COURSE_NAME} /></td>
                              <td><HindiText text={r.INSTITUTE} /></td>
                              <td className="training-tnr-cell">{formatDateOnly(r.FROM_DATE)} – {formatDateOnly(r.TO_DATE)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* --- 1.6 MANDATORY / PENDING DUE (PCC for FC/HC only + BNS/BNSS/BSA, Cyber, Induction) --- */}
          {trainingSubTab === "MANDATORY_DUE" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  ⚠️ {english ? `Mandatory / Pending Due (${filteredDueRows.length} Employees)` : `लंबित अनिवार्य प्रशिक्षण (${filteredDueRows.length} कर्मचारी)`}
                </h3>
              </div>
              <div className="training-filter-row">
                <label>
                  {english ? "Post / Rank" : "पद / रैंक"}
                  <select value={dueRankFilter} onChange={(e) => { setDueRankFilter(e.target.value); setDuePage(0); }}>
                    <option value="ALL">{english ? "All Posts" : "सभी पद (ALL)"}</option>
                    {POST_ORDER_LIST.map((r) => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {english ? "Mandatory Course" : "अनिवार्य कोर्स"}
                  <select value={dueCourseFilter} onChange={(e) => { setDueCourseFilter(e.target.value); setDuePage(0); }}>
                    <option value="ALL">{english ? "All Mandatory Courses" : "सभी अनिवार्य कोर्स"}</option>
                    {MANDATORY_DUE_COURSES.map((item) => (
                      <option key={item.label} value={item.label}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "S.N." : "क्र.सं."}</th>
                      <th>{english ? "Post" : "पद"}</th>
                      <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                      <th>{english ? "Name" : "नाम"}</th>
                      <th>{english ? "Current Posting" : "वर्तमान पदस्थापन"}</th>
                      <th>{english ? "Completed" : "पूर्ण"}</th>
                      <th>{english ? "Pending Mandatory Courses" : "लंबित अनिवार्य कोर्स"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDueRows.map((row, index) => (
                      <tr key={getTrainingEmployeeKey(row.employee)}>
                        <td className="training-tnr-cell">{duePage * pageSize + index + 1}</td>
                        <td className="training-tnr-cell">{row.CADER || "-"}</td>
                        <td className="training-tnr-cell">{isBeltRank(row.employee) ? row["BELT NO"] : "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="training-name-button"
                            onClick={() => setDetailEmployee(row.employee)}
                          >
                            <HindiText text={row.NAME} />
                          </button>
                        </td>
                        <td><HindiText text={row.POSTING} /></td>
                        <td className="training-tnr-cell">{row["पूर्ण प्रशिक्षण संख्या"]}</td>
                        <td>{row["लंबित अनिवार्य कोर्स"].join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="training-pagination">
                <button type="button" className="training-btn-secondary" disabled={duePage === 0} onClick={() => setDuePage((p) => p - 1)}>
                  ← {english ? "Prev" : "पिछला"}
                </button>
                <span className="english-cell">
                  {english ? "Page" : "पृष्ठ"} {duePage + 1} / {duePageCount} · {filteredDueRows.length ? duePage * pageSize + 1 : 0}–{Math.min(filteredDueRows.length, (duePage + 1) * pageSize)} / {filteredDueRows.length}
                </span>
                <button type="button" className="training-btn-secondary" disabled={duePage + 1 >= duePageCount} onClick={() => setDuePage((p) => p + 1)}>
                  {english ? "Next" : "अगला"} →
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* =====================================================================
          PRIMARY TAB 2: NOMINATION & ORDERS (5 SUB-TABS)
         ===================================================================== */}
      {primaryTab === "NOMINATION" && (
        <>
          <nav className="training-subtabs" aria-label={english ? "Nomination sub-tabs" : "नामांकन उप-टैब"}>
            {NOMINATION_SUBTABS.map((sub) => (
              <button
                type="button"
                key={sub.id}
                onClick={() => setNominationSubTab(sub.id)}
                className={`training-subtab-btn ${nominationSubTab === sub.id ? "is-active" : ""}`}
                aria-pressed={nominationSubTab === sub.id}
              >
                {english ? sub.en : sub.hi}
              </button>
            ))}
          </nav>

          {/* --- 2.1 & 2.2 OTHER STATE & IN-STATE 4-STAGE NOMINATION LIFECYCLE --- */}
          {isNominationFormTab && (
            <section className="training-section">
              <h3 className="training-section-title">
                {nominationSubTab === "OTHER_STATE"
                  ? (english ? "🇮🇳 National & Other State Institute Nomination" : "🇮🇳 अन्य राज्य एवं राष्ट्रीय संस्थान नामांकन व रवानगी आदेश")
                  : (english ? "🏛️ In-State Training Institute Nomination" : "🏛️ राज्य स्तरीय प्रशिक्षण संस्थान (RPA / CDTI / RPTC / PTS) नामांकन")}
              </h3>

              {/* 4-Stage Nomination Lifecycle Bar */}
              <nav className="training-lifecycle-tabs" aria-label={english ? "Nomination workflow stages" : "नामांकन कार्यवाही चरण"}>
                {NOMINATION_LIFECYCLE_TABS.map((stage) => {
                  const stageCount = stage.id === "PENDING"
                    ? ` (${pendingNominations.length})`
                    : stage.id === "DONE"
                      ? ` (${completedNominations.length})`
                      : stage.id === "NOT_DONE"
                        ? ` (${notDoneNominations.length})`
                        : "";
                  return (
                    <button
                      type="button"
                      key={stage.id}
                      onClick={() => setNominationStage(stage.id)}
                      className={`training-subtab-btn ${nominationStage === stage.id ? "is-active" : ""}`}
                      aria-pressed={nominationStage === stage.id}
                    >
                      {english ? stage.en : stage.hi}{stageCount}
                    </button>
                  );
                })}
              </nav>

              {/* STAGE 1: 📝 Letter & Wireless Generator */}
              {nominationStage === "GENERATOR" && (
                <>
                  <div className="training-institute-chips">
                    {(nominationSubTab === "OTHER_STATE" ? OTHER_STATE_INSTITUTES : IN_STATE_INSTITUTES).map((instName) => (
                      <button
                        type="button"
                        key={instName}
                        onClick={() => setInstitute(instName)}
                        className={`training-institute-chip ${institute === instName ? "is-active" : ""}`}
                      >
                        {instName}
                      </button>
                    ))}
                  </div>

                  <label className="training-search-box">
                    <span>{english ? "Search Employee (Name / Belt No. / Post)" : "कर्मचारी खोजें (नाम / बेल्ट नं. / पद)"}</span>
                    <input
                      type="search"
                      value={employeeQuery}
                      onChange={(event) => {
                        setEmployeeQuery(event.target.value);
                        setEmployee(null);
                      }}
                      placeholder={english ? "Type name or belt number..." : "नाम या बेल्ट नं. लिखें..."}
                    />
                  </label>

                  <div className="training-match-pills">
                    {employeeMatches.map((item) => (
                      <button type="button" key={item._uid || item["BELT NO"]} onClick={() => setEmployee(item)} className="training-match-pill">
                        <HindiText text={item.NAME} /> · {isBeltRank(item) ? item["BELT NO"] || "-" : "-"} · {item.CADER}
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
                          [english ? "Belt No." : "बेल्ट नं.", isBeltRank(employee) ? (employee["BELT NO"] || "-") : "-", false],
                          [english ? "Current Posting" : "वर्तमान पदस्थापन", employee.POSTING, true],
                          [english ? "Education" : "शैक्षणिक योग्यता", employee.EDUCATION, true, "EDUCATION"],
                          [english ? "Mobile No." : "मोबाइल नं.", employee["MOBILE NO 1"] || employee["MOBILE NO"], false],
                          [english ? "DOB" : "जन्मतिथि", formatDateOnly(employee["DATE OF BIRTH"]), false]
                        ].map(([label, value, useHindi, fieldName = ""]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{useHindi ? <HindiText text={value} field={fieldName} /> : (value || "-")}</dd>
                          </div>
                        ))}
                      </dl>

                      <p>
                        <strong>{english ? "Last 2 Years Training History" : "गत 02 वर्ष के प्रशिक्षण"}:</strong>{" "}
                        {recentHistory.map((row) => `${row.COURSE_NAME} (${formatDateOnly(row.FROM_DATE)}–${formatDateOnly(row.TO_DATE)})`).join(", ") || (english ? "None" : "कोई रिकॉर्ड नहीं")}
                      </p>

                      <form onSubmit={handleGenerateNomination} className="training-generator-form">
                        <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} aria-label="Training document type">
                          {TRAINING_DOCUMENTS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                        </select>
                        <input required value={course} onChange={(event) => setCourse(event.target.value)} placeholder={english ? "Course / Subject" : "प्रशिक्षण विषय / कोर्स"} />
                        <input required value={institute} onChange={(event) => setInstitute(event.target.value)} placeholder={english ? "Institute Name" : "संस्थान का नाम"} />
                        <label>{english ? "From" : "कब से"} <input required type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
                        <label>{english ? "To" : "कब तक"} <input required type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
                        {documentType !== "WIRELESS" && (
                          <input value={documentInstructions} onChange={(event) => setDocumentInstructions(event.target.value)} placeholder={english ? "Reason / Amendment / Instructions" : "कारण / संशोधन / अतिरिक्त निर्देश"} />
                        )}
                        {invalidTrainingRange && (
                          <strong role="alert" className="training-clash">⚠️ {english ? "End date cannot be before start date." : "प्रशिक्षण समाप्ति तिथि, आरंभ तिथि से पहले नहीं हो सकती।"}</strong>
                        )}
                        {(alreadyCompleted || dateClash) && (
                          <strong role="alert" className="training-clash">⚠️ {english ? "Date Clash or Course Already Completed!" : "तिथि टकराव (Date Clash) या कोर्स पहले से पूर्ण है!"}</strong>
                        )}
                        <button
                          type="submit"
                          className="training-btn-primary"
                          disabled={saving || invalidTrainingRange || (documentType === "WIRELESS" && (alreadyCompleted || dateClash))}
                        >
                          {saving ? (english ? "Saving…" : "सेव हो रहा है…") : (english ? "📨 Generate Order & Auto-Save to Vault" : "📨 आदेश बनाएं व Storage Vault में सेव करें")}
                        </button>
                      </form>
                    </>
                  )}
                </>
              )}

              {/* STAGE 2: ⏳ Pending Training */}
              {nominationStage === "PENDING" && (
                <div>
                  <h4>⏳ {english ? "Pending / Nominated Employees" : "नामांकित / प्रशिक्षणरत सूची"} ({pendingNominations.length})</h4>
                  {pendingNominations.map((row, index) => (
                    <div className="training-nomination-item" key={`pend-${row["BELT NO"]}-${index}`}>
                      <span>
                        <HindiText text={row.NAME} /> · <span className="english-cell">{row["BELT NO"] || "-"}</span> · <HindiText text={row.COURSE_NAME} /> · <HindiText text={row.INSTITUTE} /> ({formatDateOnly(row.FROM_DATE)}–{formatDateOnly(row.TO_DATE)})
                      </span>
                      <div className="training-action-bar">
                        <button type="button" className="training-btn-secondary" onClick={() => setNominationStage("DONE")}>
                          ✅ {english ? "Mark Done" : "पूर्ण दर्ज करें"}
                        </button>
                        <button type="button" className="training-btn-danger-soft" onClick={() => markNotDone(row)}>
                          ❌ {english ? "Not Done" : "अनुपस्थित / निरस्त"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingNominations.length === 0 && (
                    <p>{english ? "No pending nominations." : "कोई नामांकन लंबित नहीं है।"}</p>
                  )}
                </div>
              )}

              {/* STAGE 3: ✅ Training Done (Adds DOB No. & Date directly into All Training Record) */}
              {nominationStage === "DONE" && (
                <div>
                  <h4>✅ {english ? "Mark Training Done (Adds directly to All Training Record)" : "प्रशिक्षण पूर्ण दर्ज करें (DOB नं. व दिनांक सीधे All Training Record में जुड़ेगा)"}</h4>
                  <div className="training-status-row">
                    <input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder={english ? "Completion DOB Order No." : "पूर्ण DOB आदेश नं."} />
                    <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} aria-label="DOB आदेश दिनांक" />
                  </div>
                  {pendingNominations.map((row, index) => (
                    <div className="training-nomination-item" key={`complete-${row["BELT NO"]}-${index}`}>
                      <span>
                        <HindiText text={row.NAME} /> · <span className="english-cell">{row["BELT NO"] || "-"}</span> · <HindiText text={row.COURSE_NAME} /> · <HindiText text={row.INSTITUTE} />
                      </span>
                      <button type="button" className="training-btn-success" onClick={() => completeTraining(row)}>
                        ✅ {english ? "Complete with DOB" : "DOB सहित पूर्ण करें"}
                      </button>
                    </div>
                  ))}
                  <h4>{english ? "Completed Nominations" : "पूर्ण हो चुके प्रशिक्षण"} ({completedNominations.length})</h4>
                  {completedNominations.map((row, index) => (
                    <p key={`done-${index}`}>
                      ✅ <HindiText text={row.NAME} /> · <HindiText text={row.COURSE_NAME} /> · <HindiText text={row.INSTITUTE} /> · DOB {row.DOB_ORDER_NO} ({formatDateOnly(row.DOB_ORDER_DATE)})
                    </p>
                  ))}
                  {completedNominations.length === 0 && pendingNominations.length === 0 && (
                    <p>{english ? "No completed nominations yet." : "अभी कोई पूर्ण प्रविष्टि नहीं है।"}</p>
                  )}
                </div>
              )}

              {/* STAGE 4: ❌ Nominated but Not Done */}
              {nominationStage === "NOT_DONE" && (
                <div>
                  <h4>❌ {english ? "Nominated but Not Done / Cancelled" : "अनुपस्थित / निरस्त नामांकन (कारण सहित)"} ({notDoneNominations.length})</h4>
                  {pendingNominations.map((row, index) => (
                    <div className="training-nomination-item" key={`mark-nd-${row["BELT NO"]}-${index}`}>
                      <span>
                        <HindiText text={row.NAME} /> · <HindiText text={row.COURSE_NAME} /> ({formatDateOnly(row.FROM_DATE)}–{formatDateOnly(row.TO_DATE)})
                      </span>
                      <button type="button" className="training-btn-danger-soft" onClick={() => markNotDone(row)}>
                        ❌ {english ? "Enter Not-Done Reason" : "कारण दर्ज करें"}
                      </button>
                    </div>
                  ))}
                  {notDoneNominations.map((row, index) => (
                    <p key={`notdone-${index}`}>
                      ❌ <HindiText text={row.NAME} /> · <HindiText text={row.COURSE_NAME} /> · <strong>{row.NOT_DONE_REASON}</strong>
                    </p>
                  ))}
                  {notDoneNominations.length === 0 && pendingNominations.length === 0 && (
                    <p>{english ? "No absent / cancelled records." : "कोई अनुपस्थित / निरस्त रिकॉर्ड नहीं है।"}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* --- 2.3 IGOT KARMAYOGI & MDO ADMIN REPORT --- */}
          {nominationSubTab === "IGOT" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  💻 {english ? "iGOT Karmayogi Portal & MDO Admin Report" : "iGOT कर्मयोगी पोर्टल एवं MDO Admin रिपोर्ट"}
                </h3>
                <div className="training-action-bar">
                  <label>
                    {english ? "Month" : "माह"}{" "}
                    <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                  </label>
                  <button type="button" className="training-btn-primary" onClick={exportIgotExcel}>
                    📊 MDO Admin Excel (English)
                  </button>
                  <button type="button" className="training-btn-secondary" onClick={() => exportTableToPdfOrPrint("iGOT Karmayogi MDO Admin Report", igotData)}>
                    🖨️ {english ? "Print Report" : "प्रिंट रिपोर्ट"}
                  </button>
                </div>
              </div>

              <div className="training-summary-cards">
                <article><span>{english ? "Total Force" : "कुल नफरी"}</span><strong>{uniqueRecords.length}</strong></article>
                <article><span>{english ? "Registered" : "पंजीकृत कर्मचारी"}</span><strong>{registeredCount}</strong></article>
                <article><span>{english ? "Courses Completed" : "कोर्स पूर्ण"}</span><strong>{igotCompletedCount}</strong></article>
              </div>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      {["S.N.", "Post", "Belt No.", "Name", "Posting", "SSO ID", "Mobile", "Registered", "AI Courses", "Other Courses"].map((item) => (
                        <th key={item}>{item}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {igotData.map((row) => (
                      <tr key={row._key}>
                        <td className="training-tnr-cell">{row["S.N."]}</td>
                        <td className="training-tnr-cell">{row.Post}</td>
                        <td className="training-tnr-cell">{row["Belt No."]}</td>
                        <td><HindiText text={row.Name} /></td>
                        <td><HindiText text={row.Posting} /></td>
                        <td><input aria-label={`SSO ID ${row.Name}`} value={row["SSO ID"]} onChange={(e) => updateIgot(row._record, "SSO_ID", e.target.value)} /></td>
                        <td className="training-tnr-cell">{row.Mobile}</td>
                        <td>
                          <select aria-label={`Registered ${row.Name}`} value={row.Registered} onChange={(e) => updateIgot(row._record, "REGISTERED", e.target.value)}>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </td>
                        <td><input type="number" min="0" aria-label={`AI Courses ${row.Name}`} value={row["AI Courses"]} onChange={(e) => updateIgot(row._record, "AI_COURSES", e.target.value)} /></td>
                        <td><input type="number" min="0" aria-label={`Other Courses ${row.Name}`} value={row["Other Courses"]} onChange={(e) => updateIgot(row._record, "OTHER_COURSES", e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* --- 2.4 MAHILA AATMA RAKSHA (Rani Laxmibai Kendra) --- */}
          {nominationSubTab === "WOMEN_SELF_DEFENCE" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  🛡️ {english ? "Mahila Shakti Self-Defence Training (Rani Laxmibai Center)" : "महिला शक्ति आत्मरक्षा प्रशिक्षण — रानी लक्ष्मीबाई केन्द्र"}
                </h3>
                <div className="training-action-bar">
                  <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} aria-label="Program month" />
                  <button type="button" className="training-btn-secondary" onClick={() => exportTableToExcel("महिला शक्ति आत्मरक्षा मासिक रिपोर्ट", womenMonthlyExportRows, `Mahila_Aatma_Raksha_${reportMonth}`)}>
                    📥 Excel
                  </button>
                  <button type="button" className="training-btn-secondary" onClick={() => exportTableToWord("महिला शक्ति आत्मरक्षा मासिक रिपोर्ट", womenMonthlyExportRows, `Mahila_Aatma_Raksha_${reportMonth}`)}>
                    📄 Word
                  </button>
                  <button type="button" className="training-btn-secondary" onClick={() => exportTableToPdfOrPrint("महिला शक्ति आत्मरक्षा मासिक रिपोर्ट", womenMonthlyExportRows)}>
                    📑 PDF / 🖨️ Print
                  </button>
                </div>
              </div>

              <form onSubmit={addWomenProgram} className="training-women-form">
                <input required value={womenForm.INSTITUTION} onChange={(e) => setWomenForm({ ...womenForm, INSTITUTION: e.target.value })} placeholder={english ? "School / College Name" : "विद्यालय / महाविद्यालय का नाम"} />
                <label>{english ? "From Date" : "कब से"} <input required type="date" value={womenForm.FROM_DATE} onChange={(e) => setWomenForm({ ...womenForm, FROM_DATE: e.target.value })} /></label>
                <label>{english ? "To Date" : "कब तक"} <input required type="date" value={womenForm.TO_DATE} onChange={(e) => setWomenForm({ ...womenForm, TO_DATE: e.target.value })} /></label>
                <input required value={womenForm.MASTER_TRAINER} onChange={(e) => setWomenForm({ ...womenForm, MASTER_TRAINER: e.target.value })} placeholder={english ? "Master Trainer (Lady Const.)" : "मास्टर ट्रेनर महिला कानि."} />
                <label>{english ? "Age 13–18" : "13–18 वर्ष"} <input required type="number" min="0" value={womenForm.AGE_13_18} onChange={(e) => setWomenForm({ ...womenForm, AGE_13_18: e.target.value })} /></label>
                <label>{english ? "Age 18–35" : "18–35 वर्ष"} <input required type="number" min="0" value={womenForm.AGE_18_35} onChange={(e) => setWomenForm({ ...womenForm, AGE_18_35: e.target.value })} /></label>
                <label>{english ? "Age 35+" : "35+ वर्ष"} <input required type="number" min="0" value={womenForm.AGE_35_PLUS} onChange={(e) => setWomenForm({ ...womenForm, AGE_35_PLUS: e.target.value })} /></label>
                <strong>{english ? "Total Trainees" : "कुल प्रशिक्षणार्थी"}: {womenTotal}</strong>
                <button type="submit" className="training-btn-primary">➕ {english ? "Save Program & Vault" : "कार्यक्रम सेव करें"}</button>
              </form>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "Institution" : "संस्थान"}</th>
                      <th>{english ? "From" : "कब से"}</th>
                      <th>{english ? "To" : "कब तक"}</th>
                      <th>{english ? "Master Trainer" : "मास्टर ट्रेनर"}</th>
                      <th>13–18</th>
                      <th>18–35</th>
                      <th>35+</th>
                      <th>{english ? "Total" : "कुल"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWomenRows.map((row, index) => (
                      <tr key={`${row.INSTITUTION}-${index}`}>
                        <td><HindiText text={row.INSTITUTION} /></td>
                        <td className="training-tnr-cell">{formatDateOnly(row.FROM_DATE)}</td>
                        <td className="training-tnr-cell">{formatDateOnly(row.TO_DATE)}</td>
                        <td><HindiText text={row.MASTER_TRAINER} /></td>
                        <td className="training-tnr-cell">{row.AGE_13_18}</td>
                        <td className="training-tnr-cell">{row.AGE_18_35}</td>
                        <td className="training-tnr-cell">{row.AGE_35_PLUS}</td>
                        <td className="training-tnr-cell">{row.TOTAL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* --- 2.5 DISTRICT TRAINING CENTER (DTC Police Line Chittorgarh) --- */}
          {nominationSubTab === "DTC" && (
            <section className="training-section">
              <div className="training-section-heading">
                <h3 className="training-section-title">
                  🏫 {english ? "District Training Center (DTC Police Line) Weekly Roster" : "जिला प्रशिक्षण केन्द्र (DTC पुलिस लाइन चित्तौड़गढ़) — साप्ताहिक रोस्टर व मासिक रिपोर्ट"}
                </h3>
                <label>
                  {english ? "Report Month" : "रिपोर्ट माह"}{" "}
                  <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                </label>
              </div>

              <form onSubmit={addDtcRoster} className="training-women-form">
                <label>{english ? "Week From" : "सप्ताह कब से"} <input required type="date" value={dtcForm.WEEK_FROM} onChange={(e) => setDtcForm({ ...dtcForm, WEEK_FROM: e.target.value })} /></label>
                <label>{english ? "To" : "कब तक"} <input required type="date" value={dtcForm.WEEK_TO} onChange={(e) => setDtcForm({ ...dtcForm, WEEK_TO: e.target.value })} /></label>
                <input required value={dtcForm.POLICE_STATION} onChange={(e) => setDtcForm({ ...dtcForm, POLICE_STATION: e.target.value })} placeholder={english ? "Police Station / Office" : "थाना / कार्यालय"} />
                <input required value={dtcForm.COURSE_NAME} onChange={(e) => setDtcForm({ ...dtcForm, COURSE_NAME: e.target.value })} placeholder={english ? "Course Subject" : "प्रशिक्षण विषय"} />
                <input required value={dtcForm.INSTRUCTOR} onChange={(e) => setDtcForm({ ...dtcForm, INSTRUCTOR: e.target.value })} placeholder={english ? "Instructor" : "प्रशिक्षक"} />
                <label>{english ? "Trainees Count" : "प्रशिक्षणार्थी संख्या"} <input required min="0" type="number" value={dtcForm.TRAINEES} onChange={(e) => setDtcForm({ ...dtcForm, TRAINEES: e.target.value })} /></label>
                <button type="submit" className="training-btn-primary">➕ {english ? "Save Weekly Roster & Vault" : "साप्ताहिक रोस्टर सेव करें"}</button>
              </form>

              <div className="training-table-scroll table-responsive-box">
                <table className="training-data-table">
                  <thead>
                    <tr>
                      <th>{english ? "Police Station" : "थाना / कार्यालय"}</th>
                      <th>{english ? "From" : "कब से"}</th>
                      <th>{english ? "To" : "कब तक"}</th>
                      <th>{english ? "Subject" : "विषय"}</th>
                      <th>{english ? "Instructor" : "प्रशिक्षक"}</th>
                      <th>{english ? "Trainees" : "प्रशिक्षणार्थी"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDtcRows.map((row, index) => (
                      <tr key={`${row.POLICE_STATION}-${index}`}>
                        <td><HindiText text={row.POLICE_STATION} /></td>
                        <td className="training-tnr-cell">{formatDateOnly(row.WEEK_FROM)}</td>
                        <td className="training-tnr-cell">{formatDateOnly(row.WEEK_TO)}</td>
                        <td><HindiText text={row.COURSE_NAME} /></td>
                        <td><HindiText text={row.INSTRUCTOR} /></td>
                        <td className="training-tnr-cell">{row.TRAINEES}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* =====================================================================
          EMPLOYEE TRAINING DETAIL POPUP + QUICK ADD TRAINING
         ===================================================================== */}
      {detailEmployee && (
        <div
          className="training-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailEmployee(null);
          }}
        >
          <section className="training-detail-modal" role="dialog" aria-modal="true" aria-labelledby="training-detail-title">
            <div className="training-section-heading">
              <h3 id="training-detail-title" className="training-section-title">
                <HindiText text={detailEmployee.NAME} /> — {english ? "Training Details" : "पूर्ण प्रशिक्षण विवरण"}
              </h3>
              <button type="button" className="training-btn-secondary" onClick={() => setDetailEmployee(null)} aria-label="Close training details">
                ✕
              </button>
            </div>

            <h4>{english ? "Completed Trainings" : "पूर्ण प्रशिक्षण"} ({detailHistory.length})</h4>
            <div className="training-table-scroll table-responsive-box">
              <table className="training-data-table">
                <thead>
                  <tr>
                    <th>{english ? "S.N." : "क्र.सं."}</th>
                    <th>{english ? "Post" : "पद"}</th>
                    <th>{english ? "Belt No." : "बेल्ट नं."}</th>
                    <th>{english ? "Name" : "नाम"}</th>
                    <th>{english ? "Course" : "कोर्स का नाम"}</th>
                    <th>{english ? "From" : "कब से"}</th>
                    <th>{english ? "To" : "कब तक"}</th>
                    <th>{english ? "Institute" : "संस्थान"}</th>
                    <th>{english ? "Order No." : "आदेश नं."}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailHistory.map((row, index) => (
                    <tr key={`${row.COURSE_NAME}-${index}`}>
                      <td className="training-tnr-cell">{index + 1}</td>
                      <td className="training-tnr-cell">{detailEmployee.CADER || "-"}</td>
                      <td className="training-tnr-cell">{isBeltRank(detailEmployee) ? (row["BELT NO"] || "-") : "-"}</td>
                      <td><HindiText text={detailEmployee.NAME} /></td>
                      <td><HindiText text={row.COURSE_NAME} /></td>
                      <td className="training-tnr-cell">{formatDateOnly(row.FROM_DATE)}</td>
                      <td className="training-tnr-cell">{formatDateOnly(row.TO_DATE)}</td>
                      <td><HindiText text={row.INSTITUTE} /></td>
                      <td className="training-tnr-cell">{row.DOB_ORDER_NO || row.ORDER_NO || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4>{english ? "Pending Mandatory Trainings" : "लंबित आवश्यक प्रशिक्षण"}</h4>
            {detailMissing.length ? <ul>{detailMissing.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{english ? "All mandatory trainings completed." : "सभी आवश्यक प्रशिक्षण पूर्ण हैं।"}</p>}

            <h4>{english ? "Current Nominations" : "वर्तमान नामांकन"}</h4>
            {detailPending.length ? <ul>{detailPending.map((row, index) => <li key={`${row.COURSE_NAME}-${index}`}>{row.COURSE_NAME} · {formatDateOnly(row.FROM_DATE)}–{formatDateOnly(row.TO_DATE)}</li>)}</ul> : <p>{english ? "No pending nominations." : "कोई लंबित नामांकन नहीं।"}</p>}

            <h4>➕ {english ? "Add Training" : "नया प्रशिक्षण जोड़ें"}</h4>
            <form onSubmit={handleAddHistory} className="training-add-form">
              <input list="training-course-list" required value={newCourse} onChange={(e) => setNewCourse(e.target.value)} placeholder={english ? "Course Name" : "कोर्स का नाम"} />
              <datalist id="training-course-list">
                {REQUIRED_COURSES.map((item) => <option key={item.label} value={item.label} />)}
              </datalist>
              <label>{english ? "From" : "कब से"} <input required type="date" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} /></label>
              <label>{english ? "To" : "कब तक"} <input required type="date" value={newTo} onChange={(e) => setNewTo(e.target.value)} /></label>
              <input required value={newInstitute} onChange={(e) => setNewInstitute(e.target.value)} placeholder={english ? "Institute" : "संस्थान"} />
              <button type="submit" className="training-btn-primary">➕ {english ? "Add Training" : "प्रशिक्षण जोड़ें"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
