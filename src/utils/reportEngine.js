// src/utils/reportEngine.js
import * as XLSX from "xlsx";

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

export function calculateEarnedPL(joiningDate, asOfDate = new Date()) {
  const joined = parseAnyDate(joiningDate);
  if (!joined || joined > asOfDate) return 0;

  let earned = 0;
  for (let year = joined.getFullYear(); year <= asOfDate.getFullYear(); year += 1) {
    for (const month of [0, 6]) {
      const accrualDate = new Date(year, month, 1);
      if (accrualDate >= joined && accrualDate <= asOfDate) earned += 15;
    }
  }
  return Math.min(300, earned);
}

export function generateAllReportsData(activeRecs, depRecs = [], plLeaveRows = []) {
  const today = new Date();

  // 1 & 2. PS Wise Posting & Monthly PS Roster
  const psSummaryMap = {};
  const psWiseList = [...activeRecs]
    .sort((a, b) => String(a["POSTING"] || "ZZZ").localeCompare(String(b["POSTING"] || "ZZZ")))
    .map((rec) => {
      const psName = String(rec["POSTING"] || "अन्य / रिक्त").trim();
      const cader = String(rec["CADER"] || "").toUpperCase();
      const beltU = String(rec["BELT NO"] || "").toUpperCase();
      const mf = String(rec["M/F"] || "").toUpperCase();

      if (!psSummaryMap[psName]) {
        psSummaryMap[psName] = { HC: 0, MHC: 0, FC: 0, MFC: 0, MT: 0, RT: 0, TOTAL: 0 };
      }
      if (cader.includes("RT")) psSummaryMap[psName].RT += 1;
      else if (cader.includes("MT")) psSummaryMap[psName].MT += 1;
      else if (beltU.startsWith("MHC") || (cader.includes("HC") && mf === "F")) psSummaryMap[psName].MHC += 1;
      else if (cader.includes("HC") || beltU.startsWith("HC")) psSummaryMap[psName].HC += 1;
      else if (beltU.startsWith("MFC") || mf === "F") psSummaryMap[psName].MFC += 1;
      else psSummaryMap[psName].FC += 1;

      psSummaryMap[psName].TOTAL += 1;

      return {
        "POSTING (थाना / शाखा)": psName,
        "BELT NO": rec["BELT NO"],
        "CADER": rec["CADER"],
        "NAME": rec["NAME"],
        "FATHER NAME": rec["FATHER NAME"],
        "MOBILE NO 1": rec["MOBILE NO 1"],
        "WITHOUR DOB": rec["WITHOUR DOB"]
      };
    });

  const monthlyRoster = Object.entries(psSummaryMap).map(([ps, cnt], idx) => ({
    "क्र.सं.": idx + 1,
    "थाना / शाखा / कार्यालय": ps,
    "HC (पुरुष)": cnt.HC,
    "MHC (महिला)": cnt.MHC,
    "FC (पुरुष)": cnt.FC,
    "MFC (महिला)": cnt.MFC,
    "MT (चालक)": cnt.MT,
    "Recruit (RT)": cnt.RT,
    "कुल कार्यरत नफरी": cnt.TOTAL
  }));

  // 3. Without DOB List
  const withoutDobList = activeRecs.filter(
    (r) => String(r["POSTING DOB NO"] || "").trim() === "" || String(r["WITHOUR DOB"] || "").trim() !== ""
  );

  // 4. Recruit RT List
  const recruitRtList = activeRecs.filter((r) => String(r["CADER"] || "").toUpperCase().includes("RT"));

  // 5. 5 and 8 Year Tenure
  const tenureList = [];
  activeRecs.forEach((rec) => {
    const pDt = parseAnyDate(rec["POSTING DOB NO"]);
    if (pDt) {
      const yrs = Number(((today - pDt) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1));
      if (yrs >= 5.0) {
        tenureList.push({
          "अवधि श्रेणी": yrs >= 8.0 ? "8 वर्ष या अधिक पूर्ण" : "5 वर्ष या अधिक पूर्ण",
          "POSTING": rec["POSTING"],
          "BELT NO": rec["BELT NO"],
          "CADER": rec["CADER"],
          "NAME": rec["NAME"],
          "POSTING DOB NO": rec["POSTING DOB NO"],
          "कुल वर्ष": yrs
        });
      }
    }
  });

  // 6. Upcoming Retirements
  const retRaw = [];
  activeRecs.forEach((rec) => {
    const rd = calcRetirementDate(rec["DATE OF BIRTH"]);
    if (rd && rd >= today) {
      retRaw.push({ rd, m: Number(((rd - today) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1)), rec, st: "Active" });
    }
  });
  depRecs.forEach((rec) => {
    const rd = calcRetirementDate(rec["DATE OF BIRTH"]);
    if (rd && rd >= today) {
      retRaw.push({ rd, m: Number(((rd - today) / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1)), rec, st: "Deputation" });
    }
  });
  retRaw.sort((a, b) => a.rd - b.rd);
  const upcomingRetirements = retRaw.map((item, idx) => ({
    "क्र.सं.": idx + 1,
    "रिटायरमेंट तिथि": formatDateDDMMYYYY(item.rd),
    "शेष माह": item.m,
    "BELT NO": item.rec["BELT NO"],
    "CADER": item.rec["CADER"],
    "NAME": item.rec["NAME"],
    "FATHER NAME": item.rec["FATHER NAME"],
    "DATE OF BIRTH": formatDateDDMMYYYY(parseAnyDate(item.rec["DATE OF BIRTH"])),
    "POSTING": item.rec["POSTING"],
    "STATUS": item.st
  }));

  // 7. Seniority List
  const senRaw = [
    ...activeRecs.map((rec) => ({ doj: parseAnyDate(rec["DATE OF JOINING"]) || new Date(2099, 11, 31), rec, st: "Active / District" })),
    ...depRecs.map((rec) => ({ doj: parseAnyDate(rec["DATE OF JOINING"]) || new Date(2099, 11, 31), rec, st: "On Deputation" }))
  ].sort((a, b) => a.doj - b.doj);

  const seniorityList = senRaw.map((item, idx) => ({
    "वरिष्ठता क्र.": idx + 1,
    "CADER": item.rec["CADER"],
    "BELT NO": item.rec["BELT NO"],
    "NAME": item.rec["NAME"],
    "FATHER NAME": item.rec["FATHER NAME"],
    "DATE OF BIRTH": formatDateDDMMYYYY(parseAnyDate(item.rec["DATE OF BIRTH"])),
    "DATE OF JOINING": formatDateDDMMYYYY(parseAnyDate(item.rec["DATE OF JOINING"])),
    "DATE OF CONFIRMATION": formatDateDDMMYYYY(parseAnyDate(item.rec["DATE OF CONFIRMATION"])),
    "POSTING": item.rec["POSTING"],
    "REMARK": item.st
  }));

  // 8. PL 300 Summary
  const plUsedMap = {};
  plLeaveRows.forEach((row) => {
    const leaveType = String(row["LEAVE_TYPE"] || "").trim().toUpperCase();
    if (leaveType && leaveType !== "PL") return;
    const bKey = String(row["BELT NO"] || "").trim().toUpperCase();
    const days = Number(row["DAYS_TAKEN"] ?? row["DAYS"] ?? 0);
    if (bKey) plUsedMap[bKey] = (plUsedMap[bKey] || 0) + (Number.isFinite(days) ? days : 0);
  });

  const plSummary = activeRecs.map((rec) => {
    const bKey = String(rec["BELT NO"] || "").trim().toUpperCase();
    const doj = parseAnyDate(rec["DATE OF JOINING"]);
    const earned = calculateEarnedPL(doj, today);
    const used = plUsedMap[bKey] || 0;
    const bal = Math.min(300, Math.max(0, earned - used));
    return {
      "BELT NO": rec["BELT NO"],
      "NAME": rec["NAME"],
      "CADER": rec["CADER"],
      "POSTING": rec["POSTING"],
      "DATE OF JOINING": formatDateDDMMYYYY(doj),
      "कुल अर्जित PL": earned,
      "कुल ली गई PL": used,
      "शेष PL (Max 300)": bal
    };
  });

  return {
    monthlyRoster,
    psWiseList,
    withoutDobList,
    recruitRtList,
    tenureList,
    upcomingRetirements,
    seniorityList,
    plSummary
  };
}

export function downloadAllReportsExcel(reports) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.monthlyRoster), "Monthly_PS_Roster");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.psWiseList), "PS_Wise_Posting");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.withoutDobList), "Without_DOB_List");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.recruitRtList), "Recruit_RT_List");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.tenureList), "5_and_8_Year_Tenure");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.upcomingRetirements), "Upcoming_Retirements");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.seniorityList), "Seniority_List");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reports.plSummary), "PL_300_Summary");
  XLSX.writeFile(wb, "ALL_ESTABLISHMENT_REPORTS.xlsx");
}

export function exportEmployeeDossier(empRecord, allSheetsData = {}) {
  const wb = XLSX.utils.book_new();
  const basicRows = Object.entries(empRecord).map(([k, v]) => ({ "विवरण (Field)": k, "जानकारी (Value)": v }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(basicRows), "1_Basic_Service_Details");

  const bTarget = String(empRecord["BELT NO"] || "").trim().toUpperCase();
  const nTarget = String(empRecord["NAME"] || "").trim();

  Object.entries(allSheetsData).forEach(([sheetName, rows], idx) => {
    if (["Master_All_Data", "Deputation"].includes(sheetName)) return;
    const matched = rows.filter((r) => {
      const vals = Object.values(r).map((x) => String(x || "").trim());
      return (bTarget && vals.some((v) => v.toUpperCase() === bTarget)) || (nTarget && vals.some((v) => v.includes(nTarget)));
    });
    if (matched.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matched), `${idx + 2}_${sheetName.slice(0, 25)}`);
    }
  });

  const safeBelt = (bTarget || "EMP").replace(/\s+/g, "_");
  XLSX.writeFile(wb, `Full_Service_Dossier_${safeBelt}.xlsx`);
}
