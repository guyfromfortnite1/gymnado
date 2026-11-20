"use client";

import Model from "react-body-highlighter";
import type { Muscle } from "@/lib/types";

// Body outline with muscles highlighted (react-body-highlighter, MIT).
type MapMuscle = "chest" | "upper-back" | "lower-back" | "trapezius" | "front-deltoids" | "back-deltoids" | "biceps" | "triceps"
  | "quadriceps" | "hamstring" | "gluteal" | "calves" | "abs" | "obliques";

const PARTS: Record<Muscle, MapMuscle[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["front-deltoids", "back-deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  core: ["abs", "obliques"],
};
// Muscles best seen from behind; the first muscle passed decides the view.
const BACK_VIEW = new Set<Muscle>(["back", "triceps", "hamstrings", "glutes", "calves"]);

export default function MuscleMap({ muscles, className = "" }: { muscles: Muscle[]; className?: string }) {
  if (!muscles.length) return null;
  return (
    <div className={className} aria-hidden>
      <Model
        type={BACK_VIEW.has(muscles[0]) ? "posterior" : "anterior"}
        data={[{ name: "focus", muscles: muscles.flatMap((m) => PARTS[m]) }]}
        bodyColor="#d7eef5"
        highlightedColors={["#0077b6"]}
        style={{ height: "100%", width: "auto", margin: "0 auto" }}
        svgStyle={{ height: "100%", width: "auto" }}
      />
    </div>
  );
}
