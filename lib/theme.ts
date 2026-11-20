// Runs in <head> before the page paints, so there's no flash of the wrong theme.
// Light by default; dark only when the user turned it on in Settings. Keep in sync with components/ThemeToggle.tsx.
export const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
