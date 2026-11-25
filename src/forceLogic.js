// src/forceLogic.js
import { devToHindi } from "./utils/devlysConverter.js";

export const CADRE_GROUPS = [
  {
    id: "IPS_OFFICERS",
    title: "आई. पी. एस. अधिकारी (IPS Officers)",
    ranks: [{ code: "SP", label: "पुलिस अधीक्षक (SP)" }]
  },
  {
    id: "RPS_OFFICERS",
    title: "आर. पी. एस. अधिकारी (RPS Officers)",
    ranks: [
      { code: "ASP", label: "अतिरिक्त पुलिस अधीक्षक (ASP)" },
      { code: "DYSP", label: "पुलिस उप अधीक्षक (DySP)" }
    ]
  },
  {
    id: "CI_GROUP",
    title: "पुलिस निरीक्षक (Inspector/CI)",
    ranks: [
      { code: "CI", label: "पुलिस निरीक्षक (सामान्य)" },
      { code: "MTO", label: "पु.नि. (एम.टी. / MTO)" }
    ]
  },
  {
    id: "SI_GROUP",
    title: "उप निरीक्षक (Sub Inspector)",
    ranks: [
      { code: "SI", label: "पुलिस उप निरीक्षक (सामान्य)" },
      { code: "SI_MT", label: "उ.नि. (एम.टी.)" },
      { code: "SI_ARM", label: "उ.नि. (आर्मरर)" },
      { code: "SI_BAND", label: "उ.नि. (बैण्ड)" },
      { code: "SI_BUGL", label: "उ.नि. (बिगुलर)" }
    ]
  },
  {
    id: "ASI_GROUP",
    title: "सहायक उप निरीक्षक (ASI)",
    ranks: [
      { code: "ASI", label: "सहायक उप निरीक्षक (सामान्य)" },
      { code: "ASI_MT", label: "स.उ.नि. (एम.टी.)" },
      { code: "ASI_ARM", label: "स.उ.नि. (आर्मरर)" },
      { code: "ASI_BAND", label: "स.उ.नि. (बैण्ड)" }
    ]
  },
  {
    id: "HC_GROUP",
    title: "हैड कानिस्टेबल (HC)",
    ranks: [
      { code: "HC", label: "हैड कानिस्टेबल (सामान्य)" },
      { code: "MT_HC", label: "हैड कानि. (एम.टी.)" },
      { code: "ARM_HC", label: "हैड कानि. (आर्मरर)" },
      { code: "BAND_HC", label: "हैड कानि. (बैण्ड)" },
      { code: "DOG_HC", label: "हैड कानि. (श्वान दल)" }
    ]
  },
  {
    id: "FC_GROUP",
    title: "कानिस्टेबल (FC)",
    ranks: [
      { code: "CT", label: "कानिस्टेबल (सामान्य)" },
      { code: "MT_CT", label: "कानि. (एम.टी. / चालक)" },
      { code: "BAND_CT", label: "कानि. (बैण्ड)" },
      { code: "ARM_CT", label: "कानि. (आर्मरर)" },
      { code: "BUGLER_CT", label: "कानि. (बिगुलर)" },
      { code: "DOG_CT", label: "कानि. (श्वान दल)" },
      { code: "MOUNTED_CT", label: "कानि. (घुड़सवार)" }
    ]
  },
  {
    id: "MINISTERIAL_CADRE",
    title: "मंत्रालयिक संवर्ग (Ministerial Cadre)",
    ranks: [
      { code: "AO_MIN", label: "प्रशासनिक अधिकारी (AO)" },
      { code: "ADDL_AO", label: "अतिरिक्त प्रशासनिक अधिकारी (Addl. AO)" },
      { code: "AAO_MIN", label: "सहायक प्रशासनिक अधिकारी (AAO)" },
      { code: "STENO", label: "स्टेनो (STENO PA-II)" },
      { code: "SR_ASST", label: "वरिष्ठ सहायक (Sr. Assistant)" },
      { code: "JR_ASST", label: "कनिष्ठ सहायक / लिपिक ग्रेड-II (Jr. Assistant)" }
    ]
  },
  {
    id: "ACCOUNTS_CADRE",
    title: "लेखा संवर्ग (Accounts Cadre)",
    ranks: [
      { code: "AO_ACCT", label: "लेखाधिकारी (Accounts Officer)" },
      { code: "AAO_1", label: "सहायक लेखाधिकारी प्रथम (AAO-I)" },
      { code: "AAO_2", label: "सहायक लेखाधिकारी द्वितीय (AAO-II)" },
      { code: "JR_ACCT", label: "कनिष्ठ लेखाकार (Jr. Accountant)" }
    ]
  },
  {
    id: "IT_CADRE",
    title: "सूचना प्रौद्योगिकी संवर्ग (IT Cadre)",
    ranks: [
      { code: "PROGRAMMER", label: "प्रोग्रामर / डेटा एनालिस्ट" },
      { code: "IA", label: "सूचना सहायक (Informatics Assistant)" }
    ]
  },
  {
    id: "CLASS_4_CADRE",
    title: "चतुर्थ श्रेणी कर्मचारी एवं ट्रेड्समैन संवर्ग (सभी 17 पद)",
    ranks: [
      { code: "COOK", label: "कुक (लांगरी)" },
      { code: "JAMADAR", label: "जमादार" },
      { code: "C4_GEN", label: "च.श्रे. कर्म. (साधारण)" },
      { code: "SYCE", label: "सईस (Syce)" },
      { code: "JALDHARI", label: "जलधारी" },
      { code: "WATERMAN", label: "जलवाहक (वाटरमेन)" },
      { code: "BAGWAN", label: "बागवान / माली" },
      { code: "WASHERMAN", label: "धोबी" },
      { code: "BARBER", label: "नाई" },
      { code: "SWEEPER", label: "स्वीपर (सफाई कर्मचारी)" },
      { code: "BHISHTI", label: "भिश्ती" },
      { code: "FARASH", label: "फराश" },
      { code: "HELPER", label: "हेल्पर" },
      { code: "PEON", label: "चपरासी" },
      { code: "COBBLER", label: "कोबलर (मोची)" },
      { code: "KENNEL_BOY", label: "केनलबाय" },
      { code: "TAILOR", label: "टेलर (दर्जी)" }
    ]
  }
];

export const DEFAULT_SANCTIONED = {
  SP: 1, ASP: 4, DYSP: 12,
  CI: 38, MTO: 1,
  SI: 71, SI_MT: 3, SI_ARM: 1, SI_BAND: 0, SI_BUGL: 0,
  ASI: 279, ASI_MT: 0, ASI_ARM: 0, ASI_BAND: 0,
  HC: 371, MT_HC: 22, ARM_HC: 2, BAND_HC: 2, DOG_HC: 0,
  CT: 1524, MT_CT: 95, BAND_CT: 9, ARM_CT: 4, BUGLER_CT: 0, DOG_CT: 0, MOUNTED_CT: 0,
  AO_MIN: 1, ADDL_AO: 2, AAO_MIN: 3, STENO: 1, SR_ASST: 5, JR_ASST: 10,
  AO_ACCT: 1, AAO_1: 0, AAO_2: 1, JR_ACCT: 0,
  PROGRAMMER: 1, IA: 1,
  COOK: 10, JAMADAR: 1, C4_GEN: 3, SYCE: 0, JALDHARI: 0,
  WATERMAN: 1, BAGWAN: 1, WASHERMAN: 1, BARBER: 2, SWEEPER: 2,
  BHISHTI: 0, FARASH: 1, HELPER: 0, PEON: 0, COBBLER: 1,
  KENNEL_BOY: 0, TAILOR: 1
};

const normalizeUnitText = (value) => String(value || "")
  .toLocaleLowerCase()
  .replace(/चितौडगढ़|चितौड़गढ़|चित्तौडगढ|चित्तौडगढ़/g, "चित्तौड़गढ़")
  .replace(/निंबाहेड़ा|निम्बाहेडा|निंबाहेडा/g, "निम्बाहेड़ा")
  .replace(/बेगूँ|बेगू|बेगूं/g, "बेगूं")
  .replace(/पुलिस लाईन/g, "पुलिस लाइन")
  .replace(/[().,/]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const unitVariants = (value) => [
  normalizeUnitText(value),
  normalizeUnitText(devToHindi(value))
].filter(Boolean);

const UNIT_ALIASES = new Map([
  ["थाना कोतवाली चित्तौड़गढ़", ["Fkkuk dksrokyh fprkSMx<+", "PS Kotwali Chittorgarh", "Thana Kotwali Chittorgarh"]],
  ["थाना सदर निम्बाहेड़ा", ["Fkkuk lnj fuEckgsM+k", "PS Sadar Nimbahera", "Thana Sadar Nimbahera"]],
  ["पुलिस लाईन चित्तौड़गढ़ (RPL)", ["iqfyl ykbZu", "Police Line", "RPL"]],
  ["कार्यालय पुलिस अधीक्षक चित्तौड़गढ़ (SPO)", ["dk;kZy; iqfyl v/kh{kd", "SP Office", "SPO"]]
]);

export function matchEmployeeToUnit(posting, unit) {
  const postingVariants = unitVariants(posting);
  if (!postingVariants.length) return false;
  const unitText = String(unit || "").trim();
  const aliases = UNIT_ALIASES.get(unitText) || [];
  const candidates = [...new Set([unitText, ...aliases].flatMap(unitVariants))];

  return postingVariants.some((postingText) => candidates.some((variant) => (
    postingText === variant ||
    (variant.length >= 4 && postingText.includes(variant)) ||
    (postingText.length >= 8 && variant.includes(postingText))
  )
  ));
}

export function getEmployeeGender(employee) {
  const genderValue = [
    employee?.GENDER,
    employee?.Gender,
    employee?.SEX,
    employee?.Sex,
    employee?.लिंग,
    employee?.["GENDER (M/F)"]
  ].find((value) => String(value || "").trim());
  const gender = String(genderValue || "").trim().toLocaleLowerCase();
  if (/^(f|female|woman|women|महिला|स्त्री)$/.test(gender) || /\b(mhc|mfc)\b/i.test(String(employee?.CADER || ""))) {
    return "FEMALE";
  }
  if (/^(m|male|man|men|पुरुष)$/.test(gender)) return "MALE";
  return "UNKNOWN";
}

export function filterEmployeesByGender(records = [], filter = "ALL") {
  if (filter === "ALL") return records;
  return records.filter((employee) => getEmployeeGender(employee) === filter);
}

export function mapRankToCode(rankRaw = "", beltRaw = "") {
  const r = `${rankRaw} ${beltRaw}`.toUpperCase();
  if (r.includes("SP") && !r.includes("ASP") && !r.includes("DY")) return "SP";
  if (r.includes("ASP") || r.includes("ADDL")) return "ASP";
  if (r.includes("DYSP") || r.includes("DSP") || r.includes("CO ")) return "DYSP";
  if (r.includes("MTO")) return "MTO";
  if (r.includes("CI") || r.includes("INSPECTOR")) return "CI";

  const isMt = r.includes("MT") || r.includes("DRV") || r.includes("DRIVER") || r.includes("चालक");
  const isArm = r.includes("ARM") || r.includes("आर्मरर") || r.includes("आर्मोरर");
  const isBand = r.includes("BAND") || r.includes("बैण्ड") || r.includes("बैंड");
  const isBugl = r.includes("BUGL") || r.includes("बिगुल");
  const isDog = r.includes("DOG") || r.includes("SWAN") || r.includes("श्वान");
  const isMnt = r.includes("MOUNT") || r.includes("HORSE") || r.includes("घुड़") || r.includes("सवार");

  if (r.includes("ASI")) {
    if (isMt) return "ASI_MT";
    if (isArm) return "ASI_ARM";
    if (isBand) return "ASI_BAND";
    return "ASI";
  }
  if (r.includes("SI") && !r.includes("ASI")) {
    if (isMt) return "SI_MT";
    if (isArm) return "SI_ARM";
    if (isBand) return "SI_BAND";
    if (isBugl) return "SI_BUGL";
    return "SI";
  }
  if (r.includes("HC") || r.includes("HEAD") || r.includes("हैड")) {
    if (isMt) return "MT_HC";
    if (isArm) return "ARM_HC";
    if (isBand) return "BAND_HC";
    if (isDog) return "DOG_HC";
    return "HC";
  }

  if (r.includes("PROG") || r.includes("ANALYST")) return "PROGRAMMER";
  if (r.includes("IA") || r.includes("सूचना")) return "IA";
  if (r.includes("ADDL") && r.includes("AO")) return "ADDL_AO";
  if (r.includes("AAO-I") || r.includes("AAO 1")) return "AAO_1";
  if (r.includes("AAO-II") || r.includes("AAO 2") || (r.includes("AAO") && (r.includes("ACCT") || r.includes("लेखा")))) return "AAO_2";
  if (r.includes("AO") && !r.includes("AAO") && (r.includes("ACCT") || r.includes("लेखा"))) return "AO_ACCT";
  if (r.includes("ACCT") || r.includes("लेखा")) return "JR_ACCT";
  if (r.includes("STENO") || r.includes("स्टेनो")) return "STENO";
  if (r.includes("AO") && !r.includes("AAO")) return "AO_MIN";
  if (r.includes("AAO")) return "AAO_MIN";
  if (r.includes("SR") && r.includes("ASST")) return "SR_ASST";
  if ((r.includes("JR") && r.includes("ASST")) || r.includes("LDC") || r.includes("लिपिक")) return "JR_ASST";

  const class4Map = [
    ["COOK", "COOK"], ["JAMADAR", "JAMADAR"], ["SYCE", "SYCE"],
    ["JALDHARI", "JALDHARI"], ["WATERMAN", "WATER"], ["BAGWAN", "BAGWAN"],
    ["BAGWAN", "MALI"], ["WASHERMAN", "WASH"], ["BARBER", "BARBER"],
    ["SWEEPER", "SWEEP"], ["BHISHTI", "BHISHTI"], ["FARASH", "FARASH"],
    ["HELPER", "HELPER"], ["PEON", "PEON"], ["COBBLER", "COBBLER"],
    ["KENNEL_BOY", "KENNEL"], ["TAILOR", "TAILOR"], ["C4_GEN", "CLASS"]
  ];
  for (const [cKey, kw] of class4Map) {
    if (r.includes(kw)) return cKey;
  }

  if (isMt) return "MT_CT";
  if (isBand) return "BAND_CT";
  if (isArm) return "ARM_CT";
  if (isBugl) return "BUGLER_CT";
  if (isDog) return "DOG_CT";
  if (isMnt) return "MOUNTED_CT";
  return "CT";
}

export function parseAnyDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === "number") {
    const utcDays = Math.floor(val - 25569);
    return new Date(utcDays * 86400 * 1000);
  }
  const str = String(val).trim();
  const match = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(str);
  return isNaN(parsed) ? null : parsed;
}

export function calcRetirementDate(dobVal) {
  const dob = parseAnyDate(dobVal);
  if (!dob) return null;
  const retYear = dob.getFullYear() + 60;
  const day = dob.getDate();
  const month = dob.getMonth();

  if (day === 1) {
    if (month === 0) return new Date(retYear - 1, 11, 31);
    return new Date(retYear, month, 0);
  } else {
    return new Date(retYear, month + 1, 0);
  }
}

export function formatDateDDMMYYYY(dt) {
  if (!dt) return "-";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}
