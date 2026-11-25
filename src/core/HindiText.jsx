import { isDevlysText, isEnglishEducationToken } from "./isDevlysText";

/**
 * [COMPONENT] HindiText — DevLys 010, Unicode Hindi एवं English पाठ को सही फ़ॉन्ट में रेंडर करता है।
 * Splits on whitespace so DevLys words containing ',' (which maps to 'ए') remain intact.
 * For EDUCATION fields, standard English degrees (BA, MA, BSC, B.ED, LLB, BE, 10th, 12th, Senior Higher Secondary)
 * render in Times New Roman while Hindi-encoded degrees keep DevLys 010.
 */
export default function HindiText({ text, className = "", field = "" }) {
  if (text === null || text === undefined || String(text).trim() === "") {
    return <span className={`english-text ${className}`.trim()}>-</span>;
  }

  const str = String(text);
  const parts = str.split(/(\s+)/);
  const isEducation = field === "EDUCATION";

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const isUnicodeHindi = /[\u0900-\u097F]/.test(part);
        const isEnglishEdu = isEducation && isEnglishEducationToken(part);
        const isLegacyHindi = !isUnicodeHindi && !isEnglishEdu && isDevlysText(part);
        const partClass = isLegacyHindi
          ? "devlys-text"
          : isUnicodeHindi
            ? "unicode-hindi-text"
            : "english-text";

        return (
          <span key={i} className={partClass}>
            {part}
          </span>
        );
      })}
    </span>
  );
}
