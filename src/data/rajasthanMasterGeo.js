import {
  CHITTOR_BASE_GEO,
  RAJ_ALL_DISTRICTS_DEVLYS,
  RAJ_ALL_DISTRICTS_ENGLISH,
  RAJASTHAN_PINCODE_GEO,
  matchStandardDistrict
} from "./rajasthanGeo.js";
import { INDIA_STATES_DISTRICTS, RAJASTHAN_DISTRICT_HINDI, uniqueGeoNames } from "../utils/indiaGeoService.js";
import { devToHindi } from "../utils/devlysConverter.js";

const CHITTORGARH_KEY = "Chittorgarh";
const CHITTORGARH_LEGACY_KEY = "fpÙkkSMx<+";

const CHITTORGARH_VILLAGE_HINDI = {
  Akiya: "अकिया",
  Amarpura: "अमरपुरा",
  Anwalhera: "अनवलहेड़ा",
  "Bansen": "बांसन",
  "Bassi (Chittorgarh)": "बस्सी",
  Bichhor: "बिछोर",
  Bijaipur: "बिजयपुर",
  "Chittorgarh": "चित्तौड़गढ़",
  "Chittorgarh Fort": "चित्तौड़गढ़ दुर्ग",
  "Collectorate Chittorgarh": "जिला कलेक्ट्रेट चित्तौड़गढ़",
  Deori: "देवरी",
  Dugar: "डूंगर",
  Gopalpura: "गोपालपुरा",
  Kheri: "खेड़ी",
  Kherpura: "खेरपुरा",
  Motipura: "मोतीपुरा",
  Nagri: "नगरी",
  Ochhari: "ओछड़ी",
  Pal: "पाल",
  Palka: "पालका",
  Parsoli: "परसोली",
  Pipalwas: "पीपलवास",
  "Ranasanga Bazar Chittorgarh": "राणा सांगा बाजार चित्तौड़गढ़",
  Rajgarh: "राजगढ़",
  Sadi: "सादी",
  Sehnwa: "सेहनवा",
  Semalpura: "सेमलपुरा",
  Semlia: "सेमलिया",
  Sonagar: "सोनागर",
  "Netawal Garh Pachhali": "नेतावल गढ़ पछली"
};

const toHindiOptions = (values = []) => uniqueGeoNames(values).map((value) => ({
  value,
  label: devToHindi(value)
}));

const chittorgarhVillageRows = Object.entries(RAJASTHAN_PINCODE_GEO).flatMap(([pincode, locations]) =>
  locations
    .filter((location) => matchStandardDistrict(location.district) === CHITTORGARH_LEGACY_KEY)
    .map((location) => ({
      value: location.village,
      label: CHITTORGARH_VILLAGE_HINDI[location.village] || location.village,
      block: location.block,
      pincode,
      homePS: location.homePS
    }))
);

const seenChittorgarhVillages = new Set();
const chittorgarhVillages = chittorgarhVillageRows.filter((village) => {
  const key = village.value.trim().toLocaleLowerCase("en-IN");
  if (seenChittorgarhVillages.has(key)) return false;
  seenChittorgarhVillages.add(key);
  return true;
});

const districtNames = INDIA_STATES_DISTRICTS.Rajasthan;

export const RAJASTHAN_MASTER_DISTRICTS = Object.freeze(districtNames.map((name) => ({
  value: name,
  label: RAJASTHAN_DISTRICT_HINDI[name] || name
})));

// The repository currently carries detailed local geo records only for Chittorgarh.
// Other districts are initialized for record-backed and user-entered offline values.
export const RAJASTHAN_MASTER_GEO = Object.freeze(Object.fromEntries(
  districtNames.map((englishName) => {
    const englishIndex = RAJ_ALL_DISTRICTS_ENGLISH.indexOf(englishName);
    const legacyKey = englishIndex >= 0 ? RAJ_ALL_DISTRICTS_DEVLYS[englishIndex] : "";
    const base = legacyKey ? CHITTOR_BASE_GEO[legacyKey] : null;
    const isChittorgarh = englishName === CHITTORGARH_KEY;
    return [englishName, Object.freeze({
      district: RAJASTHAN_DISTRICT_HINDI[englishName] || englishName,
      englishName,
      tehsils: isChittorgarh ? toHindiOptions(base?.TAHSIL) : [],
      blocks: isChittorgarh ? toHindiOptions(base?.BLOCK) : [],
      villages: isChittorgarh ? chittorgarhVillages : [],
      pincodes: isChittorgarh ? uniqueGeoNames(chittorgarhVillages.map((village) => village.pincode)) : [],
      policeStations: isChittorgarh ? toHindiOptions(base?.PS) : []
    })];
  })
));

export function getRajasthanDistrictName(value) {
  const normalized = String(value || "").trim().toLocaleLowerCase("en-IN");
  return RAJASTHAN_MASTER_DISTRICTS.find((district) =>
    district.value.toLocaleLowerCase("en-IN") === normalized ||
    district.label.toLocaleLowerCase("en-IN") === normalized
  )?.value || "";
}

function readRecordValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function cleanOfficeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s*(?:\((?:B\.?O\.?|S\.?O\.?|H\.?O\.?)\)|(?:B\.?O\.?|S\.?O\.?|H\.?O\.?))\s*$/i, "")
    .trim();
}

function canonicalDistrict(rawDistrict) {
  const district = getRajasthanDistrictName(rawDistrict);
  if (district) return district;
  const legacyKey = matchStandardDistrict(rawDistrict);
  const index = RAJ_ALL_DISTRICTS_DEVLYS.indexOf(legacyKey);
  return index >= 0 ? RAJ_ALL_DISTRICTS_ENGLISH[index] : String(rawDistrict || "").trim();
}

export function getRajasthanPincodeLocations(pincode, records = []) {
  const pin = String(pincode || "").trim();
  if (!/^\d{6}$/.test(pin)) return [];

  const staticLocations = (RAJASTHAN_PINCODE_GEO[pin] || []).map((location) => ({
    ...location,
    district: canonicalDistrict(location.district),
    pincode: pin
  }));
  const recordLocations = (records || [])
    .filter((record) => {
      if (readRecordValue(record, ["PINCODE", "PIN CODE", "PIN", "POSTAL CODE", "POSTCODE"]) !== pin) return false;
      const state = readRecordValue(record, ["STATE", "STATE NAME"]).toLocaleLowerCase("en-IN");
      const district = readRecordValue(record, ["DISTRICT"]);
      return (!state || state === "rajasthan" || state === "राजस्थान") &&
        Boolean(getRajasthanDistrictName(district) || matchStandardDistrict(district));
    })
    .map((record) => ({
      state: "Rajasthan",
      district: canonicalDistrict(readRecordValue(record, ["DISTRICT"])),
      village: cleanOfficeName(readRecordValue(record, ["VILLAGE", "VILLAGE ", "POST OFFICE", "POST OFFICE NAME"])),
      block: readRecordValue(record, ["BLOCK", "TAHSIL", "CIRCLE"]),
      taluk: readRecordValue(record, ["TAHSIL", "CIRCLE", "BLOCK"]),
      homePS: readRecordValue(record, ["HOME PS", "POLICE STATION"]),
      pincode: pin
    }))
    .filter((location) => location.village);
  const seen = new Set();
  return [...staticLocations, ...recordLocations].filter((location) => {
    const key = [location.district, location.village]
      .map((part) => String(part || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN"))
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
