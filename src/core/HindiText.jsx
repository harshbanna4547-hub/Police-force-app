import { isDevlysText, isEnglishEducationToken } from "./isDevlysText";

/**
 * [COMPONENT] HindiText — Master Excel के मूल टेक्स्ट (DevLys 010 चिह्नों @, ^, _, [, ], \, +, = सहित) को बिना बदले रेंडर करता है।
 * Splits only on whitespace so DevLys 010 characters and symbols stay 100% intact.
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
