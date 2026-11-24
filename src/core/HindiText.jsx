// src/core/HindiText.jsx
import { isDevlysText } from "./isDevlysText";

export default function HindiText({ text, style = {} }) {
  if (text === null || text === undefined || text === "") {
    return <span style={{ fontFamily: "'Times New Roman', Times, serif" }}>-</span>;
  }
  const str = String(text);

  const parts = str.split(/(\s+|,)/);

  return (
    <span style={style}>
      {parts.map((part, i) => {
        if (isDevlysText(part)) {
          return (
            <span
              key={i}
              style={{
                fontFamily: "'DevLys 010', 'Kruti Dev 010', sans-serif",
                fontSize: "1.5em",
                fontWeight: "normal"
              }}
            >
              {part}
            </span>
          );
        }
        return (
          <span
            key={i}
            style={{
              fontFamily: "'Times New Roman', Times, serif"
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
