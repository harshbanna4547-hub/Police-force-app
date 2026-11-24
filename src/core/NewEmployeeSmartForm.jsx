import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { OFFICE_CO_PS_LIST, PS_CHOWKI_MAP } from "../data/officeUnits";
import { CHITTOR_BASE_GEO, RAJ_ALL_DISTRICTS_DEVLYS, RAJASTHAN_BLOCK_HOME_PS, RAJASTHAN_PINCODE_GEO, buildRajasthanGeoIndex, cleanDev, matchStandardDistrict } from "../data/rajasthanGeo";
import { RAJASTHAN_MASTER_DISTRICTS, RAJASTHAN_MASTER_GEO, getRajasthanDistrictName, getRajasthanPincodeLocations } from "../data/rajasthanMasterGeo";
import { devToHindi } from "../utils/devlysConverter";
import { uniqueGeoNames } from "../utils/indiaGeoService";

const CADER_OPTIONS = ["SP", "ASP", "DySP", "CI", "SI", "ASI", "HC", "FC", "FC(DR)", "Sr. Asst", "Jr. Asst", "Class-IV"];
const EDUCATION_OPTIONS = ["10th", "12th", "BA", "B.Sc", "B.Com", "B.A B.Ed", "B.Sc B.Ed", "MA", "M.Sc", "M.Com", "LLB", "B.Tech", "Other"];
const CATEGORY_OPTIONS = ["GEN", "OBC", "SC", "ST", "MBC", "EWS"];
const SELECTION_OPTIONS = [...CATEGORY_OPTIONS, "TSP", "Ex-Serviceman", "Sports"];
const POSTING_OPTIONS = [...new Set([...OFFICE_CO_PS_LIST, ...Object.values(PS_CHOWKI_MAP).flat()])];
const FORM_TABS = [
  { id: "PL", label: "🏖️ PL अवकाश (हर DOB अलग एंट्री)" },
  { id: "TRAINING", label: "🎓 प्रशिक्षण (Training हर DOB)" },
  { id: "SAJA", label: "⚖️ सज़ा / दण्ड (Saja हर DOB)" }
];
const PENALTY_TYPES = ["17 CC - Censure (निंदा)", "17 CC - Increment Stop (वेतन वृद्धि रोक)", "16 CC - Major Penalty", "Suspension (निलंबन)"];

function todayDmy() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function dmyToDate(value) {
  const text = String(value || "").trim();
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  return null;
}

function toDmy(value) {
  if (!value) return "";
  let date;
  if (value instanceof Date) date = value;
  else if (typeof value === "number" || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
    date = new Date(Math.round((Number(value) - 25569) * 86400 * 1000));
  } else {
    date = dmyToDate(value);
    if (!date) {
      const parsed = new Date(String(value));
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
  }
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${date.getUTCFullYear()}`;
}

function calculateDays(fromDate, toDate) {
  const from = dmyToDate(fromDate);
  const to = dmyToDate(toDate);
  if (!from || !to || to < from) return "";
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
}

function createInitialEmployee(records) {
  const usedBelts = getUsedBeltNumbers(records);
  return {
    entryType: "NEW_JOINING",
    CADER: "FC",
    "BELT NO": getNextAvailableBelt(usedBelts),
    "DISTRICT JOINING ORDER NO": "",
    "DISTRICT JOINING ORDER DATE": todayDmy(),
    NAME: "",
    "FATHER NAME": "",
    EDUCATION: "",
    "MOBILE NO 1": "",
    "DATE OF BIRTH": "",
    STATE: "Rajasthan",
    PINCODE: "",
    DISTRICT: "Chittorgarh",
    TAHSIL: "",
    BLOCK: "",
    VILLAGE: "",
    "HOME PS": "",
    POSTING: "",
    "POSTING DOB NO": "",
    "DATE OF JOINING": todayDmy(),
    "CONFIRMATION DATE": "",
    SSOID: "",
    "CAST CATEGORY": "GEN",
    "SELECTION CATEGORY": "GEN"
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  marginTop: "5px",
  border: "1px solid #CBD5E1",
  borderRadius: "7px",
  background: "#fff",
  fontSize: "0.92rem"
};
const labelStyle = { display: "block", color: "#334155", fontWeight: 700, fontSize: "0.84rem" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" };
const sectionStyle = { marginBottom: "14px", padding: "14px", border: "1px solid #E2E8F0", borderRadius: "10px", background: "#fff" };
const inputFont = { fontFamily: "'Times New Roman', Times, serif" };
const hindiInputFont = { fontFamily: "'DevLys 010', 'Kruti Dev 010', sans-serif", fontSize: "1.1rem" };

function normalizeGeoName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getUsedBeltNumbers(records) {
  return new Set((records || []).flatMap((employee) => {
    const cadre = String(employee.CADER || "").trim().toUpperCase();
    if (!cadre.startsWith("HC") && !cadre.startsWith("FC")) return [];
    const belt = employee["BELT NO"] || employee["BELT NO."] || employee.BELT_NO || employee["Belt No"] || employee.BELT || "";
    const number = String(belt).match(/\d+/)?.[0];
    return number ? [String(Number(number))] : [];
  }));
}

function getNextAvailableBelt(usedBelts) {
  let belt = 1;
  while (usedBelts.has(String(belt))) belt += 1;
  return String(belt);
}

export default function NewEmployeeSmartForm({ records, activeProfile, onSaveAll, onClose }) {
  const [form, setForm] = useState(() => createInitialEmployee(records));
  const [activeTab, setActiveTab] = useState("PL");
  const [formTab, setFormTab] = useState("PERSONAL");
  const [plDraft, setPlDraft] = useState({ fromDate: "", toDate: "", orderNo: "", remark: "" });
  const [trainingDraft, setTrainingDraft] = useState({ courseName: "", institute: "", fromDate: "", toDate: "", orderNo: "" });
  const [sajaDraft, setSajaDraft] = useState({ type: PENALTY_TYPES[0], order: "", detail: "" });
  const [plEntries, setPlEntries] = useState([]);
  const [trainingEntries, setTrainingEntries] = useState([]);
  const [sajaEntries, setSajaEntries] = useState([]);
  const [uploadingPL, setUploadingPL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postalLocations, setPostalLocations] = useState([]);
  const [geoLookupStatus, setGeoLookupStatus] = useState("");

  const geoIndex = useMemo(() => buildRajasthanGeoIndex(records || []), [records]);
  const districtNames = useMemo(() => RAJASTHAN_MASTER_DISTRICTS.map((district) => district.value), []);
  const districtMaster = form.STATE === "Rajasthan" ? RAJASTHAN_MASTER_GEO[form.DISTRICT] : null;
  const districtLocations = useMemo(
    () => districtMaster?.villages.map((location) => ({ ...location, village: location.value })) || [],
    [districtMaster]
  );
  const legacyDistrict = useMemo(
    () => form.STATE === "Rajasthan"
      ? matchStandardDistrict(getRajasthanDistrictName(form.DISTRICT) || form.DISTRICT)
      : "",
    [form.DISTRICT, form.STATE]
  );
  const districtRows = useMemo(
    () => legacyDistrict
      ? (records || []).filter((row) => {
        const rowState = String(row.STATE || row["STATE NAME"] || "").trim();
        return matchStandardDistrict(row.DISTRICT) === legacyDistrict &&
          (!rowState || ["rajasthan", "राजस्थान"].includes(rowState.toLocaleLowerCase("en-IN")));
      })
      : [],
    [records, legacyDistrict]
  );
  const districtGeo = useMemo(
    () => geoIndex[legacyDistrict] || CHITTOR_BASE_GEO[legacyDistrict] || { TAHSIL: new Set(), BLOCK: new Set(), PS: new Set(), VILLAGES: new Set() },
    [geoIndex, legacyDistrict]
  );
  const localGeoLocations = useMemo(() => form.STATE === "Rajasthan" && legacyDistrict === "fpÙkkSMx<+"
    ? Object.values(RAJASTHAN_PINCODE_GEO).flat().filter((location) =>
      matchStandardDistrict(location.district) === legacyDistrict
    )
    : [], [legacyDistrict, form.STATE]);
  const selectedTahsilRows = useMemo(
    () => districtRows.filter((row) => cleanDev(row.TAHSIL || row.CIRCLE) === form.TAHSIL),
    [districtRows, form.TAHSIL]
  );
  const selectedAreaRows = useMemo(
    () => selectedTahsilRows.filter((row) => !form.BLOCK || cleanDev(row.BLOCK) === form.BLOCK),
    [selectedTahsilRows, form.BLOCK]
  );
  const villageOptions = useMemo(() => uniqueGeoNames(
    [
      ...(!form.TAHSIL ? districtGeo.VILLAGES : []),
      ...selectedAreaRows.map((row) => cleanDev(row.VILLAGE || row["VILLAGE "])),
      ...postalLocations.filter((location) =>
        (!form.TAHSIL || normalizeGeoName(location.taluk || location.block) === normalizeGeoName(form.TAHSIL)) &&
        (!form.BLOCK || normalizeGeoName(location.block || location.taluk) === normalizeGeoName(form.BLOCK))
      ).map((location) => location.village),
      ...districtLocations.filter((location) =>
        (!form.TAHSIL || normalizeGeoName(location.taluk || location.block) === normalizeGeoName(form.TAHSIL)) &&
        (!form.BLOCK || normalizeGeoName(location.block || location.taluk) === normalizeGeoName(form.BLOCK))
      ).map((location) => location.village),
      ...localGeoLocations.filter((location) =>
        (!form.TAHSIL || normalizeGeoName(location.taluk || location.block) === normalizeGeoName(form.TAHSIL)) &&
        (!form.BLOCK || normalizeGeoName(location.block || location.taluk) === normalizeGeoName(form.BLOCK))
      ).map((location) => location.village)
    ].filter(Boolean)
  ), [districtGeo, selectedAreaRows, postalLocations, districtLocations, localGeoLocations, form.BLOCK, form.TAHSIL]);
  const tahsilOptions = useMemo(() => uniqueGeoNames([
    ...(districtMaster?.tehsils.map((option) => option.value) || []),
    ...districtGeo.TAHSIL,
    ...districtRows.map((row) => cleanDev(row.TAHSIL || row.CIRCLE)).filter(Boolean),
    ...postalLocations.map((location) => location.taluk || location.block).filter(Boolean),
    ...districtLocations.map((location) => location.taluk || location.block).filter(Boolean),
    ...localGeoLocations.map((location) => location.taluk || location.block).filter(Boolean)
  ]), [districtGeo, districtMaster, districtRows, postalLocations, districtLocations, localGeoLocations]);
  const blockOptions = useMemo(() => {
    const selectedTahsilBlocks = selectedTahsilRows.map((row) => cleanDev(row.BLOCK)).filter(Boolean);
    const blocks = selectedTahsilBlocks.length
      ? selectedTahsilBlocks
      : [...(districtMaster?.blocks.map((option) => option.value) || []), ...districtGeo.BLOCK];
    return uniqueGeoNames([
      ...blocks,
      ...postalLocations.map((location) => location.block || location.taluk).filter(Boolean),
      ...districtLocations.map((location) => location.block || location.taluk).filter(Boolean),
      ...localGeoLocations.map((location) => location.block || location.taluk).filter(Boolean)
    ]);
  }, [selectedTahsilRows, districtGeo, districtMaster, postalLocations, districtLocations, localGeoLocations]);
  const homePsOptions = useMemo(() => [...new Set([
    ...selectedAreaRows.map((row) => cleanDev(row["HOME PS"] || row["POLICE STATION"])).filter(Boolean),
    ...localGeoLocations.map((location) => location.homePS).filter(Boolean),
    ...(districtMaster?.policeStations.map((station) => station.value) || []),
    ...districtGeo.PS
  ])], [selectedAreaRows, districtGeo, localGeoLocations, districtMaster]);
  const nextPLDays = calculateDays(plDraft.fromDate, plDraft.toDate);
  const beltEnabled = form.CADER === "HC" || form.CADER.startsWith("FC");
  const usedBelts = getUsedBeltNumbers(records);
  const nextAvailableBelt = getNextAvailableBelt(usedBelts);
  const availableBelts = uniqueGeoNames([
    ...Array.from({ length: 1750 }, (_, index) => String(index + 1)).filter((belt) => !usedBelts.has(belt)),
    nextAvailableBelt
  ]);
  const legacyGeoValues = new Set([
    ...RAJ_ALL_DISTRICTS_DEVLYS,
    ...districtGeo.VILLAGES,
    ...districtGeo.TAHSIL,
    ...districtGeo.BLOCK,
    ...districtGeo.PS,
    ...districtRows.flatMap((row) => [row.TAHSIL, row.CIRCLE, row.BLOCK, row.VILLAGE, row["VILLAGE "], row["HOME PS"], row["POLICE STATION"]])
  ].filter(Boolean));
  const geoLabel = (value) => districtMaster?.villages.find((location) => location.value === value)?.label ||
    (legacyGeoValues.has(value) ? devToHindi(value) : value);

  useEffect(() => {
    const pincode = String(form.PINCODE || "");
    if (!/^\d{6}$/.test(pincode)) return undefined;
    const timer = window.setTimeout(() => {
      const locations = getRajasthanPincodeLocations(pincode, records || []);
      setPostalLocations(locations);
      if (!locations.length) {
        setGeoLookupStatus("यह पिनकोड स्थानीय राजस्थान डेटाबेस में नहीं मिला; पता हाथ से भरें।");
        return;
      }

      const districts = uniqueGeoNames(locations.map((location) => getRajasthanDistrictName(location.district)).filter(Boolean));
      const tahsils = uniqueGeoNames(locations.map((location) => location.taluk || location.block).filter(Boolean));
      const blocks = uniqueGeoNames(locations.map((location) => location.block || location.taluk).filter(Boolean));
      const villages = uniqueGeoNames(locations.map((location) => location.village).filter(Boolean));
      const policeStations = uniqueGeoNames(locations.map((location) => location.homePS).filter(Boolean));
      setForm((prev) => ({
        ...prev,
        STATE: "Rajasthan",
        DISTRICT: districts.length === 1 ? districts[0] : "",
        TAHSIL: tahsils.length === 1 ? tahsils[0] : "",
        BLOCK: blocks.length === 1 ? blocks[0] : "",
        VILLAGE: villages.length === 1 ? villages[0] : "",
        "HOME PS": policeStations.length === 1 ? policeStations[0] : ""
      }));
      setGeoLookupStatus(villages.length === 1
        ? "स्थानीय राजस्थान डेटाबेस से पता भरा गया।"
        : `${locations.length} स्थानीय स्थान मिले; सही गाँव चुनें।`);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [form.PINCODE, records]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setCader = (cader) => {
    const needsBelt = cader === "HC" || cader.startsWith("FC");
    setForm((prev) => ({
      ...prev,
      CADER: cader,
      "BELT NO": needsBelt ? (prev["BELT NO"] || nextAvailableBelt) : ""
    }));
  };
  const field = (label, key, type = "text", options = null, extraStyle = {}) => (
    <label key={key} style={labelStyle}>
      {label}
      {options ? (
        <select value={form[key]} onChange={(event) => setField(key, event.target.value)} style={{ ...fieldStyle, ...inputFont, ...extraStyle }}>
          <option value="">चुनें</option>
          {options.map((option) => (
            <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>
          ))}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={(event) => setField(key, event.target.value)} style={{ ...fieldStyle, ...inputFont, ...extraStyle }} />
      )}
    </label>
  );

  const selectState = (state) => {
    const selectedState = state === "OTHER" ? "" : state;
    setPostalLocations([]);
    setForm((prev) => ({
      ...prev,
      STATE: selectedState,
      PINCODE: "",
      DISTRICT: "",
      TAHSIL: "",
      BLOCK: "",
      VILLAGE: "",
      "HOME PS": ""
    }));
  };

  const selectDistrict = (district) => {
    setPostalLocations([]);
    setForm((prev) => ({
      ...prev,
      DISTRICT: district,
      PINCODE: "",
      TAHSIL: "",
      BLOCK: "",
      VILLAGE: "",
      "HOME PS": ""
    }));
  };

  const selectVillage = (village) => {
    const villageKey = normalizeGeoName(village);
    const matchesVillage = (row) => normalizeGeoName(cleanDev(row.VILLAGE || row["VILLAGE "])) === villageKey;
    const match = selectedAreaRows.find(matchesVillage) || districtRows.find(matchesVillage);
    const postalMatch = [...postalLocations, ...districtLocations].find((location) =>
      normalizeGeoName(location.village) === villageKey
    );
    const blockHomePs = RAJASTHAN_BLOCK_HOME_PS[postalMatch?.block] || "";
    const homePs = String(match?.["HOME PS"] || match?.["POLICE STATION"] || postalMatch?.homePS || blockHomePs || "").trim();
    setForm((prev) => ({
      ...prev,
      VILLAGE: village,
      TAHSIL: postalMatch?.taluk || postalMatch?.block || prev.TAHSIL,
      BLOCK: postalMatch?.block || postalMatch?.taluk || prev.BLOCK,
      PINCODE: postalMatch?.pincode || match?.PINCODE || match?.["PIN CODE"] || "",
      "HOME PS": homePs
    }));
  };

  const addPL = () => {
    if (!plDraft.fromDate || !plDraft.toDate || !nextPLDays) {
      alert("PL प्रविष्टि के लिए सही कब से और कब तक की तारीख़ भरें।");
      return;
    }
    setPlEntries((prev) => [...prev, { ...plDraft, days: nextPLDays, id: `${Date.now()}_${Math.random()}` }]);
    setPlDraft({ fromDate: "", toDate: "", orderNo: "", remark: "" });
  };

  const addTraining = () => {
    if (!trainingDraft.courseName.trim()) {
      alert("प्रशिक्षण कोर्स का नाम भरें।");
      return;
    }
    setTrainingEntries((prev) => [...prev, { ...trainingDraft, id: `${Date.now()}_${Math.random()}` }]);
    setTrainingDraft({ courseName: "", institute: "", fromDate: "", toDate: "", orderNo: "" });
  };

  const addSaja = () => {
    if (!sajaDraft.order.trim()) {
      alert("सज़ा आदेश नं. व दिनांक भरें।");
      return;
    }
    setSajaEntries((prev) => [...prev, { ...sajaDraft, id: `${Date.now()}_${Math.random()}` }]);
    setSajaDraft({ type: PENALTY_TYPES[0], order: "", detail: "" });
  };

  const uploadPLSheet = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPL(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      const rows = firstSheet ? XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" }) : [];
      const imported = rows.map((row, index) => {
        const fromDate = toDmy(row.FROM_DATE || row.FROM || row["कब से"] || row["FROM DATE"]);
        const toDate = toDmy(row.TO_DATE || row.TO || row["कब तक"] || row["TO DATE"]);
        const days = Number(row.DAYS_TAKEN || row.DAYS || calculateDays(fromDate, toDate) || 0);
        return {
          fromDate,
          toDate,
          days,
          orderNo: String(row.ORDER_NO_DATE || row.ORDER || row["DOB / आदेश नं."] || ""),
          remark: String(row.REMARK || row["रिमार्क"] || ""),
          id: `upload_${Date.now()}_${index}`
        };
      }).filter((row) => row.fromDate || row.toDate || row.orderNo || row.remark);
      setPlEntries((prev) => [...prev, ...imported]);
      alert(`✔ ${imported.length} PL प्रविष्टियाँ इम्पोर्ट हुईं।`);
    } catch (error) {
      console.error("PL Excel import failed:", error);
      alert(`PL शीट इम्पोर्ट नहीं हो सकी: ${error.message}`);
    } finally {
      setUploadingPL(false);
      event.target.value = "";
    }
  };

  const downloadPLSample = () => {
    const workbook = XLSX.utils.book_new();
    const sample = [{
      "BELT NO": "",
      NAME: "",
      LEAVE_YEAR: "",
      FROM_DATE: "",
      TO_DATE: "",
      DAYS_TAKEN: "",
      ORDER_NO_DATE: "",
      REMARK: ""
    }];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sample), "PL_Leave_Account");
    XLSX.writeFile(workbook, "PL_Leave_Sample.xlsx");
  };

  const downloadMasterSample = () => {
    const workbook = XLSX.utils.book_new();
    const headers = {
      "S.N.": "", CADER: "", "BELT NO": "", NAME: "", "FATHER NAME": "", EDUCATION: "",
      "MOBILE NO 1": "", "DATE OF BIRTH": "", "DATE OF JOINING": "", POSTING: "",
      "POSTING DOB NO": "", STATE: "", PINCODE: "", DISTRICT: "", TAHSIL: "", CIRCLE: "", BLOCK: "",
      VILLAGE: "", "HOME PS": "", SSOID: "", "CAST CATEGORY": "", "SELECTION CATEGORY": ""
    };
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([headers]), "Master_All_Data");
    XLSX.writeFile(workbook, "Master_Employee_Sample.xlsx");
  };

  const printDetailSlip = () => {
    const rows = [
      ["कर्मचारी का नाम", devToHindi(form.NAME)],
      ["पिता का नाम", devToHindi(form["FATHER NAME"])],
      ["पद / संवर्ग", form.CADER],
      ["बेल्ट नं.", form["BELT NO"]],
      ["आगमन प्रकार", form.entryType === "NEW_JOINING" ? "नवीन भर्ती" : "अन्य जिले/इकाई से स्थानांतरण"],
      ["आगमन आदेश नं. व दिनांक", `${form["DISTRICT JOINING ORDER NO"]} / ${form["DISTRICT JOINING ORDER DATE"]}`],
      ["शैक्षणिक योग्यता", form.EDUCATION],
      ["मोबाइल", form["MOBILE NO 1"]],
      ["जन्म तिथि", form["DATE OF BIRTH"]],
      ["राज्य / जिला / तहसील / ब्लॉक", `${form.STATE} / ${geoLabel(form.DISTRICT)} / ${geoLabel(form.TAHSIL)} / ${geoLabel(form.BLOCK)}`],
      ["पिनकोड", form.PINCODE],
      ["गाँव / गृह थाना", `${devToHindi(form.VILLAGE)} / ${devToHindi(form["HOME PS"])}`],
      ["वर्तमान पदस्थापन", devToHindi(form.POSTING)],
      ["पदस्थापन DOB नं.", form["POSTING DOB NO"]],
      ["प्रथम नियुक्ति तिथि", form["DATE OF JOINING"]],
      ["स्थायीकरण तिथि", form["CONFIRMATION DATE"]],
      ["SSOID", form.SSOID],
      ["जाति / चयन वर्ग", `${form["CAST CATEGORY"]} / ${form["SELECTION CATEGORY"]}`]
    ];
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      alert("प्रिंट विंडो नहीं खुली। कृपया इस साइट के pop-up की अनुमति दें।");
      return;
    }
    const tableRows = rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || "-")}</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>कर्मचारी विवरण पर्ची</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#172033}h1{text-align:center;font-size:20px;margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #64748b;padding:9px;text-align:left}th{width:34%;background:#eff6ff}@media print{body{padding:0}}</style></head><body><h1>कर्मचारी विवरण पर्ची — ${escapeHtml(activeProfile || "चित्तौड़गढ़")}</h1><table>${tableRows}</table><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  const saveAll = async () => {
    if (!String(form.NAME || "").trim()) {
      alert("कर्मचारी का नाम भरें।");
      return;
    }
    if (beltEnabled && !String(form["BELT NO"] || "").trim()) {
      alert("HC/FC कर्मचारी के लिए खाली बेल्ट नं. चुनें।");
      return;
    }
    if (beltEnabled && usedBelts.has(String(Number(String(form["BELT NO"]).match(/\d+/)?.[0])))) {
      alert("यह बेल्ट नं. पहले से किसी कर्मचारी को आवंटित है। कृपया खाली बेल्ट नं. चुनें।");
      return;
    }
    if (form["MOBILE NO 1"] && !/^\d{10}$/.test(form["MOBILE NO 1"])) {
      alert("मोबाइल नंबर 10 अंकों का होना चाहिए।");
      return;
    }
    setSaving(true);
    try {
      const employee = {
        ...form,
        "S.N.": (records || []).length + 1,
        "DATE OF BIRTH": toDmy(form["DATE OF BIRTH"]),
        "DATE OF JOINING": toDmy(form["DATE OF JOINING"]),
        "CONFIRMATION DATE": toDmy(form["CONFIRMATION DATE"]),
        "DISTRICT JOINING ORDER DATE": toDmy(form["DISTRICT JOINING ORDER DATE"]),
        CIRCLE: form.TAHSIL,
        "POLICE STATION": form["HOME PS"]
      };
      const saved = await onSaveAll({ employee, plEntries, trainingEntries, sajaEntries });
      if (saved === false) return;
      onClose();
      window.setTimeout(() => alert("✔ कर्मचारी और सभी संबंधित इतिहास सफलतापूर्वक सेव हो गए!"), 0);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1350, background: "rgba(15,23,42,0.68)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}
    >
      <section style={{ width: "100%", maxWidth: "1240px", maxHeight: "96vh", overflowY: "auto", background: "#F1F5F9", borderRadius: "14px", boxShadow: "0 25px 70px rgba(0,0,0,0.32)" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 2, padding: "15px 20px", background: "linear-gradient(100deg,#1456B8,#1D63DC)", color: "#fff", borderRadius: "14px 14px 0 0", fontSize: "1.08rem", fontWeight: 800 }}>
          ➕ नवीन अधिकारी / कर्मचारी प्रविष्टि फॉर्म
        </header>

        <div style={{ padding: "16px" }}>
          <nav aria-label="कर्मचारी विवरण टैब" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            {[
              ["PERSONAL", "1. Personal Details"],
              ["SERVICE", "2. Service Details"],
              ["POSTING", "3. Posting Details"],
              ["TRAINING", "4. Training Details"],
              ["PUNISHMENT", "5. Punishment Details"]
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                onClick={() => {
                  setFormTab(id);
                  if (id === "SERVICE") setActiveTab("PL");
                  if (id === "TRAINING") setActiveTab("TRAINING");
                  if (id === "PUNISHMENT") setActiveTab("SAJA");
                }}
                aria-pressed={formTab === id}
                style={{ padding: "8px 11px", border: "1px solid #CBD5E1", borderRadius: "7px", background: formTab === id ? "#1D63DC" : "#F8FAFC", color: formTab === id ? "#fff" : "#334155", fontWeight: "bold", cursor: "pointer" }}
              >
                {label}
              </button>
            ))}
          </nav>
          {formTab === "SERVICE" && (
          <section style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#0B1E3D", fontSize: "1rem" }}>खंड 1: पद एवं जिले में आगमन विवरण (Post &amp; District Joining Details)</h3>
            <div style={gridStyle}>
              <fieldset style={{ margin: 0, border: "1px solid #CBD5E1", borderRadius: "7px", padding: "8px 10px" }}>
                <legend style={{ fontSize: "0.82rem", fontWeight: "bold", color: "#334155" }}>आगमन प्रकार (Entry Type)</legend>
                <label style={{ display: "block", margin: "4px 0", cursor: "pointer" }}>
                  <input type="radio" name="entryType" checked={form.entryType === "NEW_JOINING"} onChange={() => setField("entryType", "NEW_JOINING")} /> नवीन भर्ती (New Joining)
                </label>
                <label style={{ display: "block", margin: "4px 0", cursor: "pointer" }}>
                  <input type="radio" name="entryType" checked={form.entryType === "TRANSFER"} onChange={() => setField("entryType", "TRANSFER")} /> अन्य जिले/इकाई से स्थानांतरण (Transferred Employee)
                </label>
              </fieldset>
              <label style={labelStyle}>
                पद (CADER)
                <select value={form.CADER} onChange={(event) => setCader(event.target.value)} style={{ ...fieldStyle, ...inputFont }}>
                  {CADER_OPTIONS.map((cader) => <option key={cader} value={cader}>{cader}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                खाली बेल्ट नं. (HC/FC साझा) {beltEnabled ? `(सुझाव: ${nextAvailableBelt})` : "(अधिकारी पद पर वैकल्पिक)"}
                <input
                  type="text"
                  list="smart-employee-belts"
                  disabled={!beltEnabled}
                  value={form["BELT NO"]}
                  onChange={(event) => setField("BELT NO", event.target.value.replace(/[^\d]/g, ""))}
                  placeholder={beltEnabled ? "बेल्ट नं. चुनें / लिखें" : "लागू नहीं"}
                  style={{ ...fieldStyle, ...inputFont, background: beltEnabled ? "#fff" : "#E2E8F0" }}
                />
                <datalist id="smart-employee-belts">{availableBelts.map((belt) => <option key={belt} value={belt} />)}</datalist>
                <small style={{ display: "block", color: "#15803D", marginTop: "4px" }}>उपलब्ध खाली बेल्ट नं.: {nextAvailableBelt}</small>
              </label>
              {field("जिले में आगमन आदेश नं.", "DISTRICT JOINING ORDER NO")}
              {field("आगमन आदेश दिनांक (DD-MM-YYYY)", "DISTRICT JOINING ORDER DATE")}
            </div>
          </section>
          )}

          {formTab === "PERSONAL" && (
          <>
          <section style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#0B1E3D", fontSize: "1rem" }}>खंड 2: व्यक्तिगत विवरण (Personal Details)</h3>
            <div style={gridStyle}>
              {field("कर्मचारी का नाम (DevLys 010)", "NAME", "text", null, hindiInputFont)}
              {field("पिता का नाम (DevLys 010)", "FATHER NAME", "text", null, hindiInputFont)}
              {field("शैक्षणिक योग्यता (EDUCATION)", "EDUCATION", "text", EDUCATION_OPTIONS)}
              <label style={labelStyle}>
                मोबाइल नंबर (MOBILE NO)
                <input type="tel" inputMode="numeric" maxLength="10" value={form["MOBILE NO 1"]} onChange={(event) => setField("MOBILE NO 1", event.target.value.replace(/\D/g, "").slice(0, 10))} style={{ ...fieldStyle, ...inputFont }} />
              </label>
              {field("जन्म तिथि (DOB - DD-MM-YYYY)", "DATE OF BIRTH")}
            </div>
          </section>
          </>
          )}

          {formTab === "PERSONAL" && (
          <section style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#0B1E3D", fontSize: "1rem" }}>खंड 3: स्थायी पता विवरण (पिनकोड → राज्य → जिला → तहसील → ब्लॉक → गाँव → स्वतः थाना)</h3>
            <div style={gridStyle}>
              <label style={labelStyle}>
                पिनकोड (PINCODE - 6 अंक)
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={form.PINCODE}
                  onChange={(event) => {
                    const pincode = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setField("PINCODE", pincode);
                    setPostalLocations([]);
                    if (pincode.length < 6) setGeoLookupStatus("");
                  }}
                  placeholder="जैसे 312001"
                  style={{ ...fieldStyle, ...inputFont }}
                />
              </label>
              <label style={labelStyle}>
                राज्य / केंद्र शासित प्रदेश (STATE)
                <select value={form.STATE === "Rajasthan" ? "Rajasthan" : "OTHER"} onChange={(event) => selectState(event.target.value)} style={{ ...fieldStyle, ...inputFont }}>
                  <option value="Rajasthan">राजस्थान</option>
                  <option value="OTHER">अन्य राज्य लिखें</option>
                </select>
                {form.STATE !== "Rajasthan" && (
                  <input type="text" value={form.STATE} onChange={(event) => setField("STATE", event.target.value)} placeholder="राज्य का नाम लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
              <label style={labelStyle}>
                जिला (DISTRICT)
                {form.STATE === "Rajasthan" ? (
                  <>
                    <select value={form.DISTRICT} onChange={(event) => selectDistrict(event.target.value)} style={{ ...fieldStyle, ...inputFont }}>
                      <option value="">जिला चुनें</option>
                      {form.DISTRICT && !districtNames.includes(form.DISTRICT) &&
                        <option value={form.DISTRICT}>{form.DISTRICT}</option>}
                      {RAJASTHAN_MASTER_DISTRICTS.map((district) => (
                        <option key={district.value} value={district.value}>{district.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list="rajasthan-districts"
                      value={districtNames.includes(form.DISTRICT) ? "" : form.DISTRICT}
                      onChange={(event) => selectDistrict(getRajasthanDistrictName(event.target.value) || event.target.value)}
                      placeholder="सूची में न हो तो जिला लिखें"
                      style={{ ...fieldStyle, ...inputFont }}
                    />
                    <datalist id="rajasthan-districts">
                      {RAJASTHAN_MASTER_DISTRICTS.map((district) => <option key={district.value} value={district.value} label={district.label} />)}
                    </datalist>
                  </>
                ) : (
                  <input type="text" value={form.DISTRICT} onChange={(event) => selectDistrict(event.target.value)} placeholder="जिला लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
              <label style={labelStyle}>
                तहसील (TAHSIL)
                {tahsilOptions.length ? (
                  <>
                    <select value={form.TAHSIL} onChange={(event) => setForm((prev) => ({ ...prev, TAHSIL: event.target.value, BLOCK: "", VILLAGE: "", "HOME PS": "" }))} style={{ ...fieldStyle, ...inputFont }}>
                      <option value="">तहसील चुनें</option>
                      {form.TAHSIL && !tahsilOptions.includes(form.TAHSIL) && <option value={form.TAHSIL}>{geoLabel(form.TAHSIL)}</option>}
                      {tahsilOptions.map((option) => <option key={option} value={option}>{geoLabel(option)}</option>)}
                    </select>
                    <input type="text" list="rajasthan-tahsil-options" value={tahsilOptions.includes(form.TAHSIL) ? "" : form.TAHSIL} onChange={(event) => setForm((prev) => ({ ...prev, TAHSIL: event.target.value, BLOCK: "", VILLAGE: "", "HOME PS": "" }))} placeholder="सूची में न हो तो तहसील लिखें" style={{ ...fieldStyle, ...inputFont }} />
                    <datalist id="rajasthan-tahsil-options">{tahsilOptions.map((option) => <option key={option} value={option} label={geoLabel(option)} />)}</datalist>
                  </>
                ) : (
                  <input type="text" value={form.TAHSIL} onChange={(event) => setField("TAHSIL", event.target.value)} placeholder="तहसील लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
              <label style={labelStyle}>
                ब्लॉक (BLOCK)
                {blockOptions.length ? (
                  <>
                    <select value={form.BLOCK} onChange={(event) => setForm((prev) => ({ ...prev, BLOCK: event.target.value, VILLAGE: "", "HOME PS": "" }))} style={{ ...fieldStyle, ...inputFont }}>
                      <option value="">ब्लॉक चुनें</option>
                      {form.BLOCK && !blockOptions.includes(form.BLOCK) && <option value={form.BLOCK}>{geoLabel(form.BLOCK)}</option>}
                      {blockOptions.map((option) => <option key={option} value={option}>{geoLabel(option)}</option>)}
                    </select>
                    <input type="text" list="rajasthan-block-options" value={blockOptions.includes(form.BLOCK) ? "" : form.BLOCK} onChange={(event) => setForm((prev) => ({ ...prev, BLOCK: event.target.value, VILLAGE: "", "HOME PS": "" }))} placeholder="सूची में न हो तो ब्लॉक लिखें" style={{ ...fieldStyle, ...inputFont }} />
                    <datalist id="rajasthan-block-options">{blockOptions.map((option) => <option key={option} value={option} label={geoLabel(option)} />)}</datalist>
                  </>
                ) : (
                  <input type="text" value={form.BLOCK} onChange={(event) => setField("BLOCK", event.target.value)} placeholder="ब्लॉक लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
              <label style={labelStyle}>
                गाँव / क्षेत्र / डाकघर (VILLAGE / POST OFFICE)
                {villageOptions.length ? (
                  <>
                    <select value={form.VILLAGE} onChange={(event) => selectVillage(event.target.value)} style={{ ...fieldStyle, ...inputFont }}>
                      <option value="">गाँव / डाकघर चुनें</option>
                      {form.VILLAGE && !villageOptions.includes(form.VILLAGE) && <option value={form.VILLAGE}>{geoLabel(form.VILLAGE)}</option>}
                      {villageOptions.map((option) => <option key={option} value={option}>{geoLabel(option)}</option>)}
                    </select>
                    <input type="text" list="rajasthan-village-options" value={villageOptions.includes(form.VILLAGE) ? "" : form.VILLAGE} onChange={(event) => selectVillage(event.target.value)} placeholder="सूची में न हो तो गाँव लिखें" style={{ ...fieldStyle, ...inputFont }} />
                    <datalist id="rajasthan-village-options">{villageOptions.map((option) => <option key={option} value={option} label={geoLabel(option)} />)}</datalist>
                  </>
                ) : (
                  <input type="text" value={form.VILLAGE} onChange={(event) => selectVillage(event.target.value)} placeholder="गाँव लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
              <label style={labelStyle}>
                गृह थाना (HOME PS - स्वतः चयन)
                {homePsOptions.length ? (
                  <>
                    <select value={form["HOME PS"]} onChange={(event) => setField("HOME PS", event.target.value)} style={{ ...fieldStyle, ...inputFont }}>
                      <option value="">थाना चुनें</option>
                      {form["HOME PS"] && !homePsOptions.includes(form["HOME PS"]) && <option value={form["HOME PS"]}>{geoLabel(form["HOME PS"])}</option>}
                      {homePsOptions.map((option) => <option key={option} value={option}>{geoLabel(option)}</option>)}
                    </select>
                    <input type="text" list="rajasthan-ps-options" value={homePsOptions.includes(form["HOME PS"]) ? "" : form["HOME PS"]} onChange={(event) => setField("HOME PS", event.target.value)} placeholder="सूची में न हो तो थाना लिखें" style={{ ...fieldStyle, ...inputFont }} />
                    <datalist id="rajasthan-ps-options">{homePsOptions.map((option) => <option key={option} value={option} label={geoLabel(option)} />)}</datalist>
                  </>
                ) : (
                  <input type="text" value={form["HOME PS"]} onChange={(event) => setField("HOME PS", event.target.value)} placeholder="थाना लिखें" style={{ ...fieldStyle, ...inputFont }} />
                )}
              </label>
            </div>
            {geoLookupStatus && <small role="status" style={{ display: "block", marginTop: "8px", color: geoLookupStatus.includes("नहीं") ? "#B45309" : "#166534" }}>{geoLookupStatus}</small>}
            {form.STATE === "Rajasthan" && form.DISTRICT && (
              <small style={{ display: "block", marginTop: "8px", color: "#92400E" }}>
                ऑफ़लाइन सूची उपलब्ध डेटा तक सीमित है और पूरी/सत्यापित गाँव-थाना मैपिंग का दावा नहीं करती। सूची में न मिले स्थान हाथ से दर्ज करें।
              </small>
            )}
          </section>
          )}

          {formTab === "POSTING" && (
          <section style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#0B1E3D", fontSize: "1rem" }}>खंड 4: सेवा एवं वर्तमान पदस्थापन विवरण (Service &amp; Posting Details)</h3>
            <div style={gridStyle}>
              {field("वर्तमान पदस्थापन (POSTING)", "POSTING", "text", POSTING_OPTIONS.map((place) => ({ value: place, label: devToHindi(place) })))}
              {field("पदस्थापन DOB नं. (खाली = Without DOB)", "POSTING DOB NO")}
              {field("प्रथम नियुक्ति तिथि (DD-MM-YYYY)", "DATE OF JOINING")}
              {field("स्थायीकरण तिथि (DD-MM-YYYY)", "CONFIRMATION DATE")}
              {field("SSOID", "SSOID")}
              {field("जाति वर्ग (CAST CATEGORY)", "CAST CATEGORY", "text", CATEGORY_OPTIONS)}
              {field("चयन वर्ग (SELECTION CATEGORY)", "SELECTION CATEGORY", "text", SELECTION_OPTIONS)}
            </div>
          </section>
          )}

          {["SERVICE", "TRAINING", "PUNISHMENT"].includes(formTab) && (
          <section style={sectionStyle}>
            <h3 style={{ margin: "0 0 12px", color: "#0B1E3D", fontSize: "1rem" }}>खंड 5: पूर्व सेवा का हर DOB (आदेश) अनुसार अलग-अलग PL, प्रशिक्षण व सज़ा रिकॉर्ड</h3>
            {formTab === "SERVICE" && <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              {FORM_TABS.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ padding: "8px 11px", border: "1px solid #CBD5E1", borderRadius: "7px", background: activeTab === tab.id ? "#0B1E3D" : "#F8FAFC", color: activeTab === tab.id ? "#fff" : "#334155", fontWeight: "bold", cursor: "pointer" }}>
                  {tab.label}
                </button>
              ))}
            </div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              <div>
                {activeTab === "PL" && (
                  <>
                    <div style={gridStyle}>
                      <label style={labelStyle}>कब से<input type="text" placeholder="DD-MM-YYYY" value={plDraft.fromDate} onChange={(event) => setPlDraft((prev) => ({ ...prev, fromDate: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>कब तक<input type="text" placeholder="DD-MM-YYYY" value={plDraft.toDate} onChange={(event) => setPlDraft((prev) => ({ ...prev, toDate: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>दिन (अपने आप गणना)<input type="number" readOnly value={nextPLDays} style={{ ...fieldStyle, ...inputFont, background: "#F1F5F9" }} /></label>
                      <label style={labelStyle}>DOB / आदेश नं.<input type="text" value={plDraft.orderNo} onChange={(event) => setPlDraft((prev) => ({ ...prev, orderNo: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>रिमार्क<input type="text" value={plDraft.remark} onChange={(event) => setPlDraft((prev) => ({ ...prev, remark: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <button type="button" onClick={addPL} style={{ alignSelf: "end", padding: "9px", border: 0, borderRadius: "7px", background: "#0284C7", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>➕ Add PL</button>
                    </div>
                    <EntryList
                      title="जोड़ी गई PL प्रविष्टियाँ"
                      entries={plEntries}
                      onRemove={(id) => setPlEntries((prev) => prev.filter((entry) => entry.id !== id))}
                      render={(entry) => `${entry.fromDate} से ${entry.toDate} • ${entry.days} दिन • आदेश ${entry.orderNo || "-"}`}
                    />
                  </>
                )}

                {activeTab === "TRAINING" && (
                  <>
                    <div style={gridStyle}>
                      <label style={labelStyle}>कोर्स का नाम<input type="text" value={trainingDraft.courseName} onChange={(event) => setTrainingDraft((prev) => ({ ...prev, courseName: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>संस्थान<input type="text" value={trainingDraft.institute} onChange={(event) => setTrainingDraft((prev) => ({ ...prev, institute: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>कब से<input type="text" placeholder="DD-MM-YYYY" value={trainingDraft.fromDate} onChange={(event) => setTrainingDraft((prev) => ({ ...prev, fromDate: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>कब तक<input type="text" placeholder="DD-MM-YYYY" value={trainingDraft.toDate} onChange={(event) => setTrainingDraft((prev) => ({ ...prev, toDate: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>DOB / आदेश नं.<input type="text" value={trainingDraft.orderNo} onChange={(event) => setTrainingDraft((prev) => ({ ...prev, orderNo: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <button type="button" onClick={addTraining} style={{ alignSelf: "end", padding: "9px", border: 0, borderRadius: "7px", background: "#0284C7", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>➕ Add Training</button>
                    </div>
                    <EntryList title="जोड़ी गई प्रशिक्षण प्रविष्टियाँ" entries={trainingEntries} onRemove={(id) => setTrainingEntries((prev) => prev.filter((entry) => entry.id !== id))} render={(entry) => `${entry.courseName} • ${entry.institute || "-"} • आदेश ${entry.orderNo || "-"}`} />
                  </>
                )}

                {activeTab === "SAJA" && (
                  <>
                    <div style={gridStyle}>
                      <label style={labelStyle}>सज़ा का प्रकार<select value={sajaDraft.type} onChange={(event) => setSajaDraft((prev) => ({ ...prev, type: event.target.value }))} style={{ ...fieldStyle, ...inputFont }}>{PENALTY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                      <label style={labelStyle}>आदेश नं. व दिनांक<input type="text" value={sajaDraft.order} onChange={(event) => setSajaDraft((prev) => ({ ...prev, order: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <label style={labelStyle}>विवरण<input type="text" value={sajaDraft.detail} onChange={(event) => setSajaDraft((prev) => ({ ...prev, detail: event.target.value }))} style={{ ...fieldStyle, ...inputFont }} /></label>
                      <button type="button" onClick={addSaja} style={{ alignSelf: "end", padding: "9px", border: 0, borderRadius: "7px", background: "#0284C7", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>➕ Add Saja</button>
                    </div>
                    <EntryList title="जोड़ी गई सज़ा प्रविष्टियाँ" entries={sajaEntries} onRemove={(id) => setSajaEntries((prev) => prev.filter((entry) => entry.id !== id))} render={(entry) => `${entry.type} • आदेश ${entry.order} • ${entry.detail || "-"}`} />
                  </>
                )}
              </div>

              <aside style={{ alignSelf: "start", padding: "12px", border: "1px solid #BFDBFE", borderRadius: "9px", background: "#EFF6FF" }}>
                <strong style={{ display: "block", marginBottom: "9px", color: "#1E3A8A" }}>Excel विकल्प</strong>
                <label style={{ display: "block", padding: "9px 10px", borderRadius: "7px", background: "#0284C7", color: "#fff", fontWeight: "bold", textAlign: "center", cursor: uploadingPL ? "wait" : "pointer", marginBottom: "8px" }}>
                  {uploadingPL ? "⏳ Uploading..." : "📤 Upload PL Sheet"}
                  <input type="file" accept=".xlsx,.xls" disabled={uploadingPL} onChange={uploadPLSheet} style={{ display: "none" }} />
                </label>
                <button type="button" onClick={downloadPLSample} style={{ width: "100%", padding: "9px 10px", border: "1px solid #93C5FD", borderRadius: "7px", background: "#fff", color: "#1D4ED8", fontWeight: "bold", cursor: "pointer" }}>📥 PL Sample</button>
                <small style={{ display: "block", marginTop: "8px", color: "#475569", lineHeight: 1.4 }}>Excel की PL पंक्तियाँ सहेजने से पहले सूची में दिखाई देंगी।</small>
              </aside>
            </div>
          </section>
          )}
        </div>

        <footer style={{ position: "sticky", bottom: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", padding: "12px 16px", background: "#fff", borderTop: "1px solid #CBD5E1", borderRadius: "0 0 14px 14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" disabled={saving} onClick={saveAll} style={{ padding: "9px 13px", border: 0, borderRadius: "7px", background: "#16A34A", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
              {saving ? "⏳ Saving..." : "✅ Save All (Master + सभी PL / Training / Saja)"}
            </button>
            <button type="button" onClick={printDetailSlip} style={{ padding: "9px 12px", border: 0, borderRadius: "7px", background: "#2563EB", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>🖨️ Print Detail Slip</button>
            <button type="button" onClick={downloadMasterSample} style={{ padding: "9px 12px", border: 0, borderRadius: "7px", background: "#EAB308", color: "#1F2937", fontWeight: "bold", cursor: "pointer" }}>📄 Master Sample Excel</button>
          </div>
          <button type="button" disabled={saving} onClick={onClose} style={{ padding: "9px 14px", border: "1px solid #FCA5A5", borderRadius: "7px", background: "#FEF2F2", color: "#B91C1C", fontWeight: "bold", cursor: "pointer" }}>✕ बंद करें</button>
        </footer>
      </section>
    </div>
  );
}

function EntryList({ title, entries, onRemove, render }) {
  return (
    <div style={{ marginTop: "14px" }}>
      <strong style={{ display: "block", marginBottom: "6px", color: "#334155" }}>{title} ({entries.length})</strong>
      {entries.length === 0 ? (
        <small style={{ color: "#64748B" }}>अभी कोई प्रविष्टि नहीं जोड़ी गई।</small>
      ) : (
        <div style={{ display: "grid", gap: "6px" }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: "7px", background: "#F8FAFC", fontSize: "0.85rem" }}>
              <span>{render(entry)}</span>
              <button type="button" onClick={() => onRemove(entry.id)} aria-label="प्रविष्टि हटाएं" style={{ border: 0, borderRadius: "5px", padding: "4px 7px", background: "#FEE2E2", color: "#B91C1C", fontWeight: "bold", cursor: "pointer" }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
