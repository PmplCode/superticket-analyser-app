// Product identity + unit normalisation so prices of the same item compare.

export type UnitBase = "kg" | "l" | "unit";

const UNIT_TABLE: Record<string, { base: UnitBase; factor: number }> = {
  kg: { base: "kg", factor: 1 },
  kilo: { base: "kg", factor: 1 },
  kilogram: { base: "kg", factor: 1 },
  g: { base: "kg", factor: 0.001 },
  gr: { base: "kg", factor: 0.001 },
  gram: { base: "kg", factor: 0.001 },
  lb: { base: "kg", factor: 0.45359237 },
  oz: { base: "kg", factor: 0.0283495 },
  l: { base: "l", factor: 1 },
  lt: { base: "l", factor: 1 },
  liter: { base: "l", factor: 1 },
  litre: { base: "l", factor: 1 },
  ml: { base: "l", factor: 0.001 },
  cl: { base: "l", factor: 0.01 },
  dl: { base: "l", factor: 0.1 },
  pcs: { base: "unit", factor: 1 },
  pc: { base: "unit", factor: 1 },
  piece: { base: "unit", factor: 1 },
  units: { base: "unit", factor: 1 },
  unit: { base: "unit", factor: 1 },
  ud: { base: "unit", factor: 1 },
  each: { base: "unit", factor: 1 },
  pack: { base: "unit", factor: 1 },
};

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Lowercase, accent-free, no punctuation, single spaces. */
export const normalizeProductName = (name: string) =>
  stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Stable product key: also removes size tokens such as "1l", "500 g". */
export const productKeyOf = (name: string) => {
  const cleaned = normalizeProductName(name)
    .replace(/\b\d+([.,]\d+)?\s?(kg|g|gr|l|lt|ml|cl|dl|ud|uds|x)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || normalizeProductName(name);
};

/** Deterministic 53-bit hash (cyrb53) rendered as base36. */
export const hashString = (str: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

export interface UnitPrice {
  unitPrice: number;
  base: UnitBase;
}

/** Price per kg / l / unit, or null when it cannot be computed safely. */
export const computeUnitPrice = (
  price: number,
  quantity?: number,
  unit?: string
): UnitPrice | null => {
  if (!Number.isFinite(price) || price <= 0) return null;
  const q = quantity !== undefined && Number.isFinite(quantity) ? quantity : 1;
  if (q <= 0) return null;

  if (!unit) {
    return { unitPrice: Math.round((price / q) * 100) / 100, base: "unit" };
  }
  const entry = UNIT_TABLE[stripAccents(unit).toLowerCase().trim().replace(/\.$/, "")];
  if (!entry) return null;
  const amount = q * entry.factor;
  if (amount <= 0) return null;
  return { unitPrice: Math.round((price / amount) * 100) / 100, base: entry.base };
};
