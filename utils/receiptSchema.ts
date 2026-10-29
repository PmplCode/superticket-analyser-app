import { normalizeDateString } from "./dates";

export const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat & Fish",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Snacks & Sweets",
  "Household",
  "Personal Care",
  "Other",
] as const;

export interface ExtractedItem {
  name: string;
  price: number;
  quantity?: number;
  unit?: string;
  category: string;
}

export interface ExtractedTicketData {
  date: string;
  supermarket: string;
  items: ExtractedItem[];
  total: number;
}

const CATEGORY_LOOKUP = new Map(
  CATEGORIES.map((c) => [c.toLowerCase(), c as string])
);

export const normalizeCategory = (value: unknown): string => {
  if (typeof value !== "string") return "Other";
  const found = CATEGORY_LOOKUP.get(value.trim().toLowerCase());
  return found ?? "Other";
};

/** Accepts 12.5, "12.5", "12,50", "€12,50", "1.234,56". */
export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** First balanced {...} block in the text, ignoring fences and prose. */
export const extractJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

/** Returns a clean ticket or null when nothing usable was extracted. */
export const parseReceipt = (raw: unknown): ExtractedTicketData | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.items)) return null;

  const items: ExtractedItem[] = [];
  for (const entry of obj.items) {
    if (!entry || typeof entry !== "object") continue;
    const it = entry as Record<string, unknown>;
    const name = typeof it.name === "string" ? it.name.trim() : "";
    const price = toNumber(it.price);
    if (!name || price === null || price === 0) continue;
    const quantity = toNumber(it.quantity);
    const unit =
      typeof it.unit === "string" && it.unit.trim() ? it.unit.trim() : undefined;
    items.push({
      name,
      price: Math.round(price * 100) / 100,
      quantity: quantity !== null && quantity > 0 ? quantity : undefined,
      unit,
      category: normalizeCategory(it.category),
    });
  }
  if (items.length === 0) return null;

  const sum = items.reduce((s, i) => s + i.price, 0);
  const total = toNumber(obj.total);
  return {
    supermarket:
      typeof obj.supermarket === "string" ? obj.supermarket.trim() : "",
    date: normalizeDateString(obj.date),
    items,
    total:
      total !== null && total > 0
        ? Math.round(total * 100) / 100
        : Math.round(sum * 100) / 100,
  };
};
