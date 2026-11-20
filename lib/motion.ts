// Timing for the .fade-out animation in app/globals.css (browser-only).

/** How long to wait for a fade-out to finish; 0 when the user prefers reduced motion. */
export const fadeOutMs = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
