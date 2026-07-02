type ClassValue = string | number | null | boolean | undefined;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
