/** Vaste light theme — geen dag/nacht-wisseling. */
export const THEME_COLOR = "#0066a1";

export function applyThemeMode() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = "day";
  document.documentElement.style.colorScheme = "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLOR);
  }
}

/** Inline boot script — vaste light theme vóór hydration. */
export const themeBootScript = `(function(){try{document.documentElement.dataset.theme='day';document.documentElement.style.colorScheme='light';}catch(e){}})()`;
