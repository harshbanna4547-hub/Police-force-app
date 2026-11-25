// src/core/HindiText.jsx
import { useEffect, useState } from "react";
import { isDevlysText } from "./isDevlysText";
import { devToHindi } from "../utils/devlysConverter";
import { isDevLysFontAvailable, loadDevLysFont } from "./fontLoader";

export default function HindiText({ text, style = {} }) {
  const [forceUnicode, setForceUnicode] = useState(() =>
    typeof window !== "undefined" &&
      (window.innerWidth <= 1024 || !isDevLysFontAvailable())
  );

  useEffect(() => {
    const updateFontMode = () => {
      const isSmallViewport = window.innerWidth <= 1024;
      setForceUnicode(isSmallViewport || !isDevLysFontAvailable());
      if (!isSmallViewport) {
        loadDevLysFont().then((fontAvailable) => {
          setForceUnicode(window.innerWidth <= 1024 || !fontAvailable);
        });
      }
    };
    window.addEventListener("resize", updateFontMode);
    updateFontMode();
    return () => {
      window.removeEventListener("resize", updateFontMode);
    };
  }, []);

  if (text === null || text === undefined || text === "") {
    return <span style={{ fontFamily: "'Noto Sans Devanagari', 'Times New Roman', Times, serif" }}>-</span>;
  }
  const str = String(text);
  const displayText = forceUnicode && isDevlysText(str) ? devToHindi(str) : str;

  const parts = displayText.split(/(\s+|,)/);

  return (
    <span style={style}>
      {parts.map((part, i) => {
        if (isDevlysText(part)) {
          return (
            <span
              key={i}
              style={{
                fontFamily: "'DevLys 010', 'Kruti Dev 010', 'Noto Sans Devanagari', sans-serif",
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
              fontFamily: "'Noto Sans Devanagari', 'Times New Roman', Times, serif"
            }}
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
