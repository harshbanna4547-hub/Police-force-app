let devLysFontLoad;

export function isDevLysFontAvailable() {
  return typeof document !== "undefined" &&
    Boolean(document.fonts?.check('16px "DevLys 010"'));
}

export function loadDevLysFont() {
  if (typeof document === "undefined" || !document.fonts) {
    return Promise.resolve(false);
  }
  if (isDevLysFontAvailable()) return Promise.resolve(true);

  if (!devLysFontLoad) {
    devLysFontLoad = document.fonts.load('16px "DevLys 010"')
      .then(() => isDevLysFontAvailable())
      .catch((error) => {
        console.warn("DevLys font could not be loaded; Unicode text will be used.", error);
        return false;
      });
  }
  return devLysFontLoad;
}
