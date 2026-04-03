import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function nowIso(): string {
  return new Date().toISOString();
}
