import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const DISTRICT_OPTIONS = [
  { code: "AJMER", name: "Ajmer", hindiName: "अजमेर" },
  { code: "ALWAR", name: "Alwar", hindiName: "अलवर" },
  { code: "BALOTRA", name: "Balotra", hindiName: "बालोतरा" },
  { code: "BANSWARA", name: "Banswara", hindiName: "बांसवाड़ा" },
  { code: "BARAN", name: "Baran", hindiName: "बारां" },
  { code: "BARMER", name: "Barmer", hindiName: "बाड़मेर" },
  { code: "BEAWAR", name: "Beawar", hindiName: "ब्यावर" },
  { code: "BHARATPUR", name: "Bharatpur", hindiName: "भरतपुर" },
  { code: "BHILWARA", name: "Bhilwara", hindiName: "भीलवाड़ा" },
  { code: "BIKANER", name: "Bikaner", hindiName: "बीकानेर" },
  { code: "BUNDI", name: "Bundi", hindiName: "बूंदी" },
  { code: "CHITTORGARH", name: "Chittorgarh", hindiName: "चित्तौड़गढ़" },
  { code: "CHURU", name: "Churu", hindiName: "चूरू" },
  { code: "DAUSA", name: "Dausa", hindiName: "दौसा" },
  { code: "DEEG", name: "Deeg", hindiName: "डीग" },
  { code: "DHOLPUR", name: "Dholpur", hindiName: "धौलपुर" },
  { code: "DIDWANA_KUCHAMAN", name: "Didwana-Kuchaman", hindiName: "डीडवाना-कुचामन" },
  { code: "DUNGARPUR", name: "Dungarpur", hindiName: "डूंगरपुर" },
  { code: "HANUMANGARH", name: "Hanumangarh", hindiName: "हनुमानगढ़" },
  { code: "JAIPUR", name: "Jaipur", hindiName: "जयपुर" },
  { code: "JAISALMER", name: "Jaisalmer", hindiName: "जैसलमेर" },
  { code: "JALORE", name: "Jalore", hindiName: "जालोर" },
  { code: "JHALAWAR", name: "Jhalawar", hindiName: "झालावाड़" },
  { code: "JHUNJHUNU", name: "Jhunjhunu", hindiName: "झुंझुनूं" },
  { code: "JODHPUR", name: "Jodhpur", hindiName: "जोधपुर" },
  { code: "KARAULI", name: "Karauli", hindiName: "करौली" },
  { code: "KHAIRTHAL_TIJARA", name: "Khairthal-Tijara", hindiName: "खैरथल-तिजारा" },
  { code: "KOTA", name: "Kota", hindiName: "कोटा" },
  { code: "KOTPUTLI_BEHROR", name: "Kotputli-Behror", hindiName: "कोटपुतली-बहरोड़" },
  { code: "NAGAUR", name: "Nagaur", hindiName: "नागौर" },
  { code: "PALI", name: "Pali", hindiName: "पाली" },
  { code: "PHALODI", name: "Phalodi", hindiName: "फलोदी" },
  { code: "PRATAPGARH", name: "Pratapgarh", hindiName: "प्रतापगढ़" },
  { code: "RAJSAMAND", name: "Rajsamand", hindiName: "राजसमंद" },
  { code: "SALUMBAR", name: "Salumbar", hindiName: "सलूंबर" },
  { code: "SAWAI_MADHOPUR", name: "Sawai Madhopur", hindiName: "सवाई माधोपुर" },
  { code: "SRI_GANGANAGAR", name: "Sri Ganganagar", hindiName: "श्रीगंगानगर" },
  { code: "SIKAR", name: "Sikar", hindiName: "सीकर" },
  { code: "SIROHI", name: "Sirohi", hindiName: "सिरोही" },
  { code: "TONK", name: "Tonk", hindiName: "टोंक" },
  { code: "UDAIPUR", name: "Udaipur", hindiName: "उदयपुर" }
];

let supabaseClient;

function getCloudClient() {
  if (!isCloudConfigured) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return supabaseClient;
}

export function normalizeDistrictId(value) {
  const districtId = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (!districtId) throw new Error("जिला पहचान खाली नहीं हो सकती।");
  return districtId;
}

export async function fetchDistrictCloudData(districtId) {
  const client = getCloudClient();
  if (!client) return null;
  const { data, error } = await client
    .from("district_data")
    .select("payload,updated_at")
    .eq("district_id", normalizeDistrictId(districtId))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    payload: decodeStorageVaultItems(data.payload || {})
  };
}

function bytesToBase64(data) {
  let bytes = null;
  if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else if (ArrayBuffer.isView(data)) {
    bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (!bytes) return null;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function decodeStorageVaultItems(payload) {
  if (!Array.isArray(payload.storageVaultItems)) return payload;
  return {
    ...payload,
    storageVaultItems: payload.storageVaultItems.map((item) => {
      if (!item.data?.base64) return item;
      const binary = atob(item.data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return { ...item, data: bytes.buffer };
    })
  };
}

function encodeStorageVaultItems(payload) {
  if (!Array.isArray(payload.storageVaultItems)) {
    return { ...payload, originalWorkbook: null };
  }
  return {
    ...payload,
    originalWorkbook: null,
    storageVaultItems: payload.storageVaultItems.map((item) => {
      const base64 = bytesToBase64(item.data);
      return base64 ? { ...item, data: { base64 } } : item;
    })
  };
}

export async function saveDistrictCloudData(districtId, payload) {
  const client = getCloudClient();
  if (!client) throw new Error("क्लाउड कॉन्फ़िगरेशन उपलब्ध नहीं है।");
  const { error } = await client.from("district_data").upsert({
    district_id: normalizeDistrictId(districtId),
    payload: encodeStorageVaultItems(payload),
    updated_at: new Date().toISOString()
  }, { onConflict: "district_id" });
  if (error) throw error;
}
