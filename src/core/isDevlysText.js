const UPPERCASE_ENGLISH_TOKENS = new Set([
  "BSC", "MSC", "BA", "MA", "BE", "BCOM", "MCOM", "BED", "MED", "LLB", "LLM",
  "BBA", "BCA", "MCA", "MBA", "BTECH", "MTECH", "PGDCA", "PHD",
  "IPS", "RPS", "GEN", "OBC", "SC", "ST", "MBC", "EWS", "TSP",
  "IT", "MOB", "DCRB", "PCR", "SPO", "RPL", "AHTU", "FSL", "DSB", "DTC",
  "PA", "DE", "PE", "CO", "PS", "CI", "SI", "ASI", "HC", "FC", "CT",
  "MFC", "MHC", "MT", "RT", "GD", "DR", "SP", "ASP", "DYSP", "MTO",
  "IGOT", "MDO", "PCC", "DPC", "ACP", "DOB", "DOJ", "DOC", "SSOID", "VIP"
]);

const MIXED_ENGLISH_WORDS = /^(10th|12th|8th|10\+2|VIII|X|XII|DySP|Addl\.?|Graduate|Postgraduate|Post|Senior|Higher|Secondary|High|School|Matric|Matriculation|Diploma|Degree|Honours|Hons|Pass|Other|Active|Deputation|Attachment|Retirement|Death|Relieve|Male|Female|All|Unknown|B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?E|B\.?Com|M\.?Com|B\.?Ed|M\.?Ed|B\.?Tech|M\.?Tech|L\.?L\.?[BM]|Ph\.?D|B\.?C\.?A|M\.?C\.?A|B\.?B\.?A|M\.?B\.?A|P\.?G\.?D\.?C\.?A|Sr\.?|Jr\.?|Asst\.?|Constable|Inspector|Sub)$/i;

const EDUCATION_ENGLISH_WORD = /^(ba|ma|bsc|msc|bed|med|llb|llm|be|bcom|mcom|btech|mtech|bca|mca|bba|mba|pgdca|phd|10th|12th|8th|10\+2|senior|higher|secondary|high|school|matric|matriculation|graduate|post|postgraduate|diploma|degree|arts|science|commerce|engineering|honours|hons|pass|b\.?a|m\.?a|b\.?sc|m\.?sc|b\.?ed|m\.?ed|b\.?e|b\.?com|m\.?com|b\.?tech|m\.?tech|l\.?l\.?[bm]|ph\.?d|b\.?c\.?a|m\.?c\.?a|b\.?b\.?a|m\.?b\.?a|p\.?g\.?d\.?c\.?a)$/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// [FONT HELPER] Detects English degree tokens inside EDUCATION strings so Times New Roman is used
export function isEnglishEducationToken(token) {
  const cleanWord = String(token || "").trim().replace(/^[.,()\-/:;]+|[.,()\-/:;]+$/g, "");
  if (!cleanWord) return false;
  if (/[\u0900-\u097F]/.test(cleanWord)) return false;
  if (/^[\d\-/.:,()\s]+$/.test(cleanWord)) return true;
  return EDUCATION_ENGLISH_WORD.test(cleanWord);
}

// [FONT HELPER] Preserves DevLys 010 symbols (@, ^, _, [, ], \, +, =) while separating English/numbers/dates
export function isDevlysText(txt) {
  if (txt === null || txt === undefined) return false;
  const s = String(txt).trim();
  if (!s) return false;

  if (/[\u0900-\u097F]/.test(s)) return false;
  if (EMAIL_PATTERN.test(s) || /^https?:\/\//i.test(s)) return false;
  if (/^[\d\-/.:,()\s]+$/.test(s)) return false;

  const cleanWord = s.replace(/^[.,()\-/:]+|[.,()\-/:]+$/g, "");
  if (!cleanWord) return false;
  if (/^[\d\-/.:,()\s]+$/.test(cleanWord)) return false;
  if (UPPERCASE_ENGLISH_TOKENS.has(cleanWord)) return false;
  if (UPPERCASE_ENGLISH_TOKENS.has(cleanWord.replace(/\./g, ""))) return false;
  if (MIXED_ENGLISH_WORDS.test(cleanWord)) return false;
  if (/^[A-Z0-9._/-]+$/.test(cleanWord) && /\d/.test(cleanWord)) return false;

  return true;
}
