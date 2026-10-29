import type { Product, ProductPrice, Ticket } from "../store/ticketStore";
import { getDateTimestamp, parseDate } from "./dates";
import { monthKeyOf } from "./format";

const ts = (date: string) => {
  const t = getDateTimestamp(date);
  return Number.isNaN(t) ? 0 : t;
};

export const sortPricesByDate = (prices: ProductPrice[]) =>
  [...prices].sort((a, b) => ts(a.date) - ts(b.date));

export interface PriceMover {
  product: Product;
  latest: ProductPrice;
  previous: ProductPrice;
  delta: number;
  percent: number;
  sameStore: boolean;
}

/** Latest vs previous price; prefers a previous price from the same store. */
export const getPriceMovers = (products: Product[]): PriceMover[] => {
  const movers: PriceMover[] = [];
  products.forEach((product) => {
    if (product.prices.length < 2) return;
    const sorted = sortPricesByDate(product.prices);
    const latest = sorted[sorted.length - 1];
    const earlier = sorted.slice(0, -1);
    const sameStorePrev = [...earlier]
      .reverse()
      .find((p) => p.supermarket === latest.supermarket);
    const previous = sameStorePrev ?? earlier[earlier.length - 1];
    const delta = latest.price - previous.price;
    if (delta === 0 || previous.price <= 0) return;
    movers.push({
      product,
      latest,
      previous,
      delta,
      percent: (delta / previous.price) * 100,
      sameStore: Boolean(sameStorePrev),
    });
  });
  return movers.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
};

export interface StoreComparison {
  product: Product;
  cheapest: ProductPrice;
  mostExpensive: ProductPrice;
  savingPercent: number;
}

/** Products seen in 2+ stores: where is it cheapest (by unit price when known). */
export const getStoreComparisons = (products: Product[]): StoreComparison[] => {
  const result: StoreComparison[] = [];
  products.forEach((product) => {
    const latestByStore = new Map<string, ProductPrice>();
    sortPricesByDate(product.prices).forEach((p) =>
      latestByStore.set(p.supermarket, p)
    );
    if (latestByStore.size < 2) return;
    const entries = [...latestByStore.values()];
    const comparable = entries.every((e) => e.unitPrice !== undefined && e.unit === entries[0].unit);
    const value = (p: ProductPrice) => (comparable ? p.unitPrice! : p.price);
    const sorted = entries.sort((a, b) => value(a) - value(b));
    const cheapest = sorted[0];
    const mostExpensive = sorted[sorted.length - 1];
    if (value(mostExpensive) <= 0) return;
    result.push({
      product,
      cheapest,
      mostExpensive,
      savingPercent:
        ((value(mostExpensive) - value(cheapest)) / value(mostExpensive)) * 100,
    });
  });
  return result.sort((a, b) => b.savingPercent - a.savingPercent);
};

export const getCategorySpending = (tickets: Ticket[], monthKey?: string) => {
  const map = new Map<string, number>();
  tickets.forEach((ticket) => {
    if (monthKey) {
      const d = parseDate(ticket.date);
      if (Number.isNaN(d.getTime()) || monthKeyOf(d) !== monthKey) return;
    }
    ticket.items.forEach((item) => {
      if (item.price === 0) return;
      const category = item.category || "Other";
      map.set(category, (map.get(category) ?? 0) + item.price);
    });
  });
  return [...map.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);
};

export const getMonthTotals = (tickets: Ticket[]) => {
  const map = new Map<string, number>();
  tickets.forEach((ticket) => {
    const d = parseDate(ticket.date);
    if (Number.isNaN(d.getTime())) return;
    const key = monthKeyOf(d);
    map.set(key, (map.get(key) ?? 0) + ticket.total);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};

export const getStoreTotals = (tickets: Ticket[], monthKey?: string) => {
  const map = new Map<string, { total: number; trips: number }>();
  tickets.forEach((ticket) => {
    if (monthKey) {
      const d = parseDate(ticket.date);
      if (Number.isNaN(d.getTime()) || monthKeyOf(d) !== monthKey) return;
    }
    const entry = map.get(ticket.supermarket) ?? { total: 0, trips: 0 };
    entry.total += ticket.total;
    entry.trips += 1;
    map.set(ticket.supermarket, entry);
  });
  return [...map.entries()]
    .map(([supermarket, v]) => ({ supermarket, ...v }))
    .sort((a, b) => b.total - a.total);
};

export const shiftMonthKey = (monthKey: string, delta: number) => {
  const [y, m] = monthKey.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
};

/** Largest remainder rounding so shares always add up to 100. */
export const roundShares = (values: number[]): number[] => {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let remainder = 100 - floors.reduce((s, v) => s + v, 0);
  raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (remainder > 0) {
        floors[i] += 1;
        remainder -= 1;
      }
    });
  return floors;
};
