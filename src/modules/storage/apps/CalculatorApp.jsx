import { useState } from "react";

function evaluateSafeArithmetic(expr) {
  const cleaned = String(expr || "").replace(/[^0-9+\-*/.%() ]/g, "").trim();
  if (!cleaned) return "0";
  const tokens = cleaned.match(/(\d+(?:\.\d+)?|[+\-*/()])/g);
  if (!tokens) return "Error";
  // Simple two-pass operator precedence (+ - vs * /) without eval
  let pos = 0;
  const parseExpr = () => {
    let val = parseTerm();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const right = parseTerm();
      val = op === "+" ? val + right : val - right;
    }
    return val;
  };
  const parseTerm = () => {
    let val = parseFactor();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === "/" && right === 0) throw new Error("Div0");
      val = op === "*" ? val * right : val / right;
    }
    return val;
  };
  const parseFactor = () => {
    const tok = tokens[pos];
    if (tok === "(") {
      pos += 1;
      const inner = parseExpr();
      if (tokens[pos] === ")") pos += 1;
      return inner;
    }
    if (tok === "-") {
      pos += 1;
      return -parseFactor();
    }
    pos += 1;
    const n = Number(tok);
    if (!Number.isFinite(n)) throw new Error("NaN");
    return n;
  };
  try {
    const out = parseExpr();
    return Number.isInteger(out) ? String(out) : String(Number(out.toFixed(6)));
  } catch {
    return "Error";
  }
}

const KEYS = [
  "C", "⌫", "(", ")",
  "7", "8", "9", "/",
  "4", "5", "6", "*",
  "1", "2", "3", "-",
  "0", ".", "=", "+"
];

/**
 * [APP] CalculatorApp — Windows 11 Standard Office Calculator
 */
export default function CalculatorApp() {
  const [expr, setExpr] = useState("0");

  const pressKey = (k) => {
    if (k === "C") return setExpr("0");
    if (k === "⌫") return setExpr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
    if (k === "=") return setExpr((prev) => evaluateSafeArithmetic(prev));
    setExpr((prev) => (prev === "0" || prev === "Error" ? (["+", "*", "/", "."].includes(k) ? `0${k}` : k) : `${prev}${k}`));
  };

  return (
    <div className="wapp-calc-wrap">
      <div className="wapp-calc-display" aria-live="polite">{expr}</div>
      <div className="wapp-calc-grid">
        {KEYS.map((k) => {
          const isOp = ["+", "-", "*", "/", "C", "⌫", "(", ")"].includes(k);
          const isEq = k === "=";
          return (
            <button
              key={k}
              type="button"
              onClick={() => pressKey(k)}
              className={`wapp-calc-key${isOp ? " is-op" : ""}${isEq ? " is-eq" : ""}`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
