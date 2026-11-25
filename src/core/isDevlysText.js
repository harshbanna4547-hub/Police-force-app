const UPPERCASE_ENGLISH_TOKENS = new Set([
  "BSC", "MSC", "BA", "MA", "BCOM", "MCOM", "BED", "MED", "LLB", "LLM",
  "BBA", "BCA", "MCA", "MBA", "BTECH", "MTECH", "PHD",
  "IPS", "RPS", "GEN", "OBC", "SC", "ST", "MBC", "EWS", "TSP",
  "IT", "MOB", "DCRB", "PCR", "SPO", "RPL", "AHTU", "FSL", "DSB", "DTC",
  "PA", "DE", "PE", "CO", "PS", "CI", "SI", "ASI", "HC", "FC", "CT",
  "MFC", "MHC", "MT", "RT", "GD", "DR", "SP", "ASP", "DYSP", "MTO",
  "IGOT", "MDO", "PCC", "DPC", "ACP", "DOB", "DOJ", "DOC", "SSOID", "VIP"
]);

const MIXED_ENGLISH_WORDS = /^(10th|12th|VIII|X|XII|DySP|Addl\.?|Graduate|Postgraduate|Other|Active|Deputation|Attachment|Retirement|Death|Relieve|Male|Female|All|Unknown|B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Com|M\.?Com|B\.?Ed|M\.?Ed|B\.?Tech|M\.?Tech|Sr\.?|Jr\.?|Asst\.?|Constable|Inspector|Sub)$/i;

export function isDevlysText(txt) {
  if (txt === null || txt === undefined) return false;
  const s = String(txt).trim();
  if (!s) return false;

  if (/[\u0900-\u097F]/.test(s)) return false;
  if (/@/.test(s) || /^https?:\/\//i.test(s)) return false;
  if (/^[\d\-/.:,()@&\s]+$/.test(s)) return false;

  const cleanWord = s.replace(/^[.,()\-/:]+|[.,()\-/:]+$/g, "");
  if (!cleanWord) return false;
  if (/^[\d\-/.:,()@&\s]+$/.test(cleanWord)) return false;
  if (UPPERCASE_ENGLISH_TOKENS.has(cleanWord)) return false;
  if (MIXED_ENGLISH_WORDS.test(cleanWord)) return false;
  if (/^[A-Z0-9._/-]+$/.test(cleanWord) && /\d/.test(cleanWord)) return false;

  return true;
}
