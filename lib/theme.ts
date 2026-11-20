// Runs in <head> before the page paints, so there's no flash:
// - theme: light by default; dark only when the user turned it on in Settings (keep in sync with components/ThemeToggle.tsx)
// - intro: skip the opening splash if it already played in this browser session (components/Splash.tsx)
export const THEME_SCRIPT = `try{var d=document.documentElement;if(localStorage.getItem("theme")==="dark")d.classList.add("dark");if(sessionStorage.getItem("gn-splash"))d.classList.add("splash-seen")}catch(e){}`;
