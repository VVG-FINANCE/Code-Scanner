import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null) return "0.00000";
  return price.toFixed(5);
}

export function formatPips(pips: number | undefined | null): string {
  if (pips === undefined || pips === null) return "0.0";
  const sign = pips > 0 ? "+" : "";
  return `${sign}${pips.toFixed(1)}`;
}

export function formatPercentage(val: number | undefined | null): string {
  if (val === undefined || val === null) return "0.00%";
  return `${val.toFixed(2)}%`;
}
