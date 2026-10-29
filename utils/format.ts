import { parseDate } from "./dates";

export const CURRENCY = "EUR";
export const LOCALE = "es-ES";

const priceFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

export const formatPrice = (value: number) =>
  priceFormatter.format(Number.isFinite(value) ? value : 0);

export const formatSignedPrice = (value: number) =>
  `${value > 0 ? "+" : ""}${formatPrice(value)}`;

export const formatPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDate = (value: string) => {
  const parsed = parseDate(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return dateFormatter.format(parsed);
};

export const formatMonthKey = (monthKey: string, withYear = false) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    ...(withYear ? { year: "2-digit" as const } : {}),
  });
};

export const monthKeyOf = (date: Date) =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
