// Browser-only helpers for logging a meal. The Food tab hands a photo or starting items to the
// /food/log page through sessionStorage (photos are too big for the URL).
import type { FoodItem } from "./types";

export const EMPTY_ITEM: FoodItem = { name: "", portion: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

/** Shrink the photo in the browser (max 1024 px, JPEG) so uploads are small and fast. */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = URL.createObjectURL(file);
  });
}

export type PendingMeal = { photo?: string; items?: FoodItem[] };
const KEY = "gymnado-pending-meal";

export function setPendingMeal(m: PendingMeal) {
  sessionStorage.setItem(KEY, JSON.stringify(m));
}

/** Reads and clears what the Food tab handed over (null if nothing, e.g. after a reload). */
export function takePendingMeal(): PendingMeal | null {
  const raw = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  try {
    return raw ? (JSON.parse(raw) as PendingMeal) : null;
  } catch {
    return null;
  }
}
