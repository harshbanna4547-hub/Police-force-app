// src/components/HindiText.jsx
import React from "react";

export function isDevlysText(txt) {
  if (!txt) return false;
  const s = String(txt).trim();
  if (!s) return false;

  if (/[\u0900-\u097F]/.test(s)) return false;
  if (/^[\d\-/.:,()@&\s]+$/.test(s)) return false;

  const cleanWord = s.replace(/[.,()\-/]/g, "");
  if (/^(BSC|MSC|BA|MA|BCOM|MCOM|BED|MED|LLB|LLM|BBA|BCA|MCA|MBA|BTECH|MTECH|PHD|10TH|12TH|VIII|X|XII|GRADUATE|POSTGRADUATE|IPS|RPS|GEN|OBC|SC|ST|MBC|EWS|IT|MOB|DCRB|PCR|SPO|RPL|AHTU|CO|PS|CI|SI|ASI|HC|FC|MFC|MHC|MT|RT|GD)$/i.test(cleanWord)) {
    return false;
  }

  return true;
}

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
