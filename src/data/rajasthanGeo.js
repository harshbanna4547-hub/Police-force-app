// src/data/rajasthanGeo.js

export const RAJ_ALL_DISTRICTS_DEVLYS = [
  "fpÙkkSMx<+",        // चित्तौड़गढ़
  "mn;iqj",            // उदयपुर
  "HkhyokM+k",         // भीलवाड़ा
  "izrkix<+",          // प्रतापगढ़
  "jktlean",           // राजसमंद
  "ck¡lokM+k",         // बांसवाड़ा
  "Mw¡xjiqj",          // डूंगरपुर
  "lywEcj",            // सलूंबर
  "'kkgiqjk",          // शाहपुरा
  "dksVk",             // कोटा
  "c¡wnh",             // बूंदी
  "ckjka",             // बारां
  "÷kykokM+",          // झालावाड़
  "vtesj",             // अजमेर
  "C;koj",             // ब्यावर
  "dsdM+h",            // केकड़ी
  "ukxkSj",            // नागौर
  "MhsMokuk&dqpkEu",   // डीडवाना-कुचामन
  "Vksad",             // टोंक
  "t;iqj",             // जयपुर
  "nwMw",              // दूदू
  "dksViwryh&cgjksM+", // कोटपूतली-बहरोड़
  "vyoj",              // अलवर
  "Hkjriqj",           // भरतपुर
  "Mhx",               // डीग
  "/kkSyiqj",          // धौलपुर
  "djkSyh",            // करौली
  "lokbZ ek/kksiqj",   // सवाई माधोपुर
  "xaxkiqj flVh",      // गंगापुर सिटी
  "nkSlk",             // दौसा
  "lhdj",              // सीकर
  "uhe dk Fkkuk",      // नीम का थाना
  "÷qa÷quw",           // झुंझुनू
  "pw:",               // चूरू
  "chdkusj",           // बीकानेर
  "Jhxaxkuxj",         // श्रीगंगानगर
  "guqekux<+",         // हनुमानगढ़
  "vuwix<+",           // अनूपगढ़
  "tks/kiqj",          // जोधपुर
  "Qyksnh",            // फलौदी
  "tSlyesj",           // जैसलमेर
  "ckM+esj",           // बाड़मेर
  "ckykSrjk",          // बालोतरा
  "tkykSj",            // जालौर
  "lk¡pkSj",           // सांचौर
  "ikyh",              // पाली
  "fljksgh"            // सिरोही
];

export const CHITTOR_BASE_GEO = {
  "fpÙkkSMx<+": {
    TAHSIL: ["fpÙkkSMx<+", "xaxjkj", "csxw¡", "jkorHkkVk", "diklu", "Hkwikylkxj", "jk'keh", "Hknlsj", "cM+hlknM+h", "Mw¡xyk", "cLlh", "fuEckgsM+k"],
    BLOCK: ["fpÙkkSMx<+", "xaxjkj", "csxw¡", "HkasljksM+x<+", "diklu", "Hkwikylkxj", "jk'keh", "Hknlsj", "cM+hlknM+h", "Mw¡xyk", "fuEckgsM+k"],
    PS: ["dksrokyh fpÙkkSMx<+", "lnj fpÙkkSMx<+", "pUnsfj;k", "cLlh", "xaxjkj", "csxw¡", "jkorHkkVk", "HkasljksM+x<+", "diklu", "Hkwikylkxj", "jk'keh", "Hknlsj", "HknlksM+k", "e.MfQ;k", "vkdksyk", "fuEckgsM+k dksrokyh", "fuEckgsM+k lnj", "dusjk", "fudqEHk", "cM+hlknM+h", "Mw¡xyk", "eaxyokM+", "ikjlksyh", "'kEHkwiqjk", "fot;iqj", "tko+nk", "lknkl"]
  }
};

export function cleanDev(val) {
  let s = String(val || "").trim();
  s = s.replace(/\s+/g, " ").replace(/^[ .,\-_/]+|[ .,\-_/]+$/g, "");
  if (!s || s.length < 2 || ["NONE", "NULL", "NA", "N/A", "0"].includes(s.toUpperCase())) {
    return "";
  }
  if (/[\u0900-\u097F]/.test(s)) return "";
  return s;
}

export function matchStandardDistrict(rawDist) {
  const s = cleanDev(rawDist);
  if (!s) return "";
  if (RAJ_ALL_DISTRICTS_DEVLYS.includes(s)) return s;

  const baseS = s.replace(/[+¡.\s&-]/g, "");
  for (const stdD of RAJ_ALL_DISTRICTS_DEVLYS) {
    const baseStd = stdD.replace(/[+¡.\s&-]/g, "");
    if (baseS === baseStd || (baseStd.length >= 4 && baseS.includes(baseStd))) {
      return stdD;
    }
  }
  return "";
}

export function buildRajasthanGeoIndex(records) {
  const geoDb = {};
  RAJ_ALL_DISTRICTS_DEVLYS.forEach((dName) => {
    geoDb[dName] = {
      TAHSIL: new Set(CHITTOR_BASE_GEO[dName]?.TAHSIL || []),
      BLOCK: new Set(CHITTOR_BASE_GEO[dName]?.BLOCK || []),
      PS: new Set(CHITTOR_BASE_GEO[dName]?.PS || []),
      VILLAGES: new Set()
    };
  });

  records.forEach((r) => {
    const dist = matchStandardDistrict(r["DISTRICT"]);
    if (!dist || !geoDb[dist]) return;

    const tah = cleanDev(r["CIRCLE"]);
    const blk = cleanDev(r["BLOCK"]);
    const ps = cleanDev(r["POLICE STATION"]);
    const vil = cleanDev(r["VILLAGE"] || r["VILLAGE "]);

    if (tah) geoDb[dist].TAHSIL.add(tah);
    if (blk) geoDb[dist].BLOCK.add(blk);
    if (ps) geoDb[dist].PS.add(ps);
    if (vil) geoDb[dist].VILLAGES.add(vil);
  });

  return geoDb;
}
