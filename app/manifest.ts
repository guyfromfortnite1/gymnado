import type { MetadataRoute } from "next";

// Lets people install GymNado to their home screen / desktop and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymNado",
    short_name: "GymNado",
    description: "Your training plan, workouts, food tracking and AI coach.",
    start_url: "/",
    display: "standalone",
    background_color: "#03045e",
    theme_color: "#03045e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
