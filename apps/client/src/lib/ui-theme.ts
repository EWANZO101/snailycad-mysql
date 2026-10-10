export type UiTheme = "new" | "classic";

export const UI_THEME_STORAGE_KEY = "snailycad_ui_theme";
export const UI_THEME_CHOSEN_EVENT = "snailycad:ui-theme-chosen";
export const OPEN_THEME_PICKER_EVENT = "snailycad:open-theme-picker";

/** runs before the page is painted (see pages/_document.tsx) so there's no flash of the wrong theme */
export const UI_THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${UI_THEME_STORAGE_KEY}");document.documentElement.setAttribute("data-ui-theme",t==="classic"?"classic":"new")}catch(e){}`;

export function getSavedUiTheme(): UiTheme | null {
  try {
    const value = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return value === "classic" || value === "new" ? value : null;
  } catch {
    return null;
  }
}

export function applyUiTheme(theme: UiTheme) {
  document.documentElement.setAttribute("data-ui-theme", theme);
}

export function saveUiTheme(theme: UiTheme) {
  applyUiTheme(theme);
  try {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable: the theme only applies to this page
  }
  window.dispatchEvent(new Event(UI_THEME_CHOSEN_EVENT));
}

export function openThemePicker() {
  window.dispatchEvent(new Event(OPEN_THEME_PICKER_EVENT));
}
