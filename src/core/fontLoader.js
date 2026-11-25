export function isDevLysFontAvailable() {
  return typeof document !== "undefined" &&
    Boolean(document.fonts?.check('16px "DevLys 010"'));
}
