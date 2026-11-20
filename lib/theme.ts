// Runs in <head> before the page paints, so there's no flash of the wrong theme.
// Keep in sync with apply() in components/ThemeToggle.tsx.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
