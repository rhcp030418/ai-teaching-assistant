import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcResponseRate(
  totalFeedbacks: number,
  studentCount: number | null
): number | null {
  if (!studentCount || studentCount <= 0 || totalFeedbacks > studentCount) return null;
  return Math.round((totalFeedbacks / studentCount) * 100);
}
