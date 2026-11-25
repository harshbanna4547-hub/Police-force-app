import { isDevlysText } from "./isDevlysText";

export default function HindiText({ text, style = {} }) {
  if (text === null || text === undefined || text === "") {
    return <span style={{ fontFamily: "'Noto Sans Devanagari', 'Times New Roman', Times, serif" }}>-</span>;
  }
  const str = String(text);
  const parts = str.split(/(\s+|,)/);

  return (
    <span style={style}>
      {parts.map((part, i) => {
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
              ...(isLegacyHindi ? { fontSize: "17px", lineHeight: 1.4 } : {})
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
