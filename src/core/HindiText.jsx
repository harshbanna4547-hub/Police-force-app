import { isDevlysText } from "./isDevlysText";

export default function HindiText({ text, style = {}, className = "" }) {
  if (text === null || text === undefined || String(text).trim() === "") {
    return (
      <span
        className={className}
        style={{ fontFamily: "'Times New Roman', Times, serif", ...style }}
      >
        -
      </span>
    );
  }

  const str = String(text);
  const parts = str.split(/(\s+)/);

  return (
    <span className={className} style={style}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
        const isUnicodeHindi = /[\u0900-\u097F]/.test(part);
        const isLegacyHindi = !isUnicodeHindi && isDevlysText(part);
        return (
          <span
            key={i}
            style={{
              fontFamily: isLegacyHindi
                ? "'DevLys 010', sans-serif"
                : isUnicodeHindi
                  ? "'Noto Sans Devanagari', sans-serif"
                  : "'Times New Roman', Times, serif",
              ...(isLegacyHindi ? { fontSize: "17px", lineHeight: 1.45 } : {})
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
