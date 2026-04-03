/**
 * Format a number as USD currency.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = "USD"
): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate simple straight-line depreciation.
 * Returns the estimated current value and percent depreciated.
 */
export function calcDepreciation(
  purchasePrice: number,
  purchaseDateIso: string,
  annualDepreciationRate = 0.15 // 15% per year default
): { currentValue: number; depreciationPct: number; yearsOwned: number } {
  const purchaseDate = new Date(purchaseDateIso);
  const now = new Date();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const yearsOwned = (now.getTime() - purchaseDate.getTime()) / msPerYear;
  const depreciationPct = Math.min(annualDepreciationRate * yearsOwned, 0.95);
  const currentValue = purchasePrice * (1 - depreciationPct);
  return { currentValue, depreciationPct, yearsOwned };
}

/**
 * Sum an array of numbers, ignoring nulls.
 */
export function sumNonNull(values: (number | null | undefined)[]): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
