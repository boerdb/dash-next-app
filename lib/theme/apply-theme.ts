/** Vaste Weer&Radar-achtige dark theme — geen dag/nacht-wisseling. */
export const THEME_COLOR = "#083052";

export function applyThemeMode() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = "day";
  document.documentElement.style.colorScheme = "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLOR);
  }
}

/** Inline boot script — vaste dark theme vóór hydration. */
export const themeBootScript = `(function(){try{document.documentElement.dataset.theme='day';document.documentElement.style.colorScheme='dark';}catch(e){}})()`;
