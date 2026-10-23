/** Licht als basis; donker volgt de systeeminstelling van het toestel. */
export const THEME_COLOR_LIGHT = "#f4f3ee";
export const THEME_COLOR_DARK = "#121412";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function applyThemeMode() {
  if (typeof document === "undefined") return;
  const dark = window.matchMedia(DARK_QUERY).matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  }
}

/** Luistert naar systeemwissel licht/donker; geeft opruimfunctie terug. */
export function watchThemeMode(): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  const onChange = () => applyThemeMode();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Inline boot script — juiste thema vóór hydration (geen witte flits in donker). */
export const themeBootScript = `(function(){try{var d=window.matchMedia('${DARK_QUERY}').matches;document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})()`;
