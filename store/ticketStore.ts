import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  normalizeDateString,
  getDateTimestamp,
  todayISODate,
} from "../utils/dates";
import {
  computeUnitPrice,
  hashString,
  productKeyOf,
  UnitBase,
} from "../utils/productKey";

export interface ProductPrice {
  price: number;
  /** Base unit of `unitPrice`: kg, l or unit. */
  unit?: UnitBase;
  quantity?: number;
  unitPrice?: number;
  date: string;
  supermarket: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  prices: ProductPrice[];
}

export interface ProductSearchResult extends Product {
  latestPrice: ProductPrice;
  lowestPrice: ProductPrice;
  highestPrice: ProductPrice;
  storeCount: number;
  supermarkets: string[];
}

export type ProductSortMode =
  | "lowest-price"
  | "latest-price"
  | "recent-purchase";

export interface TicketItem {
  name: string;
  price: number;
  quantity?: number;
  unit?: string;
  category: string;
}

export interface Ticket {
  id: string;
  date: string;
  supermarket: string;
  items: TicketItem[];
  total: number;
  imageUri?: string;
}

interface TicketState {
  tickets: Ticket[];
  /** Derived from `tickets`; never persisted. */
  products: Product[];
  currentTicket: Ticket | null;
  supermarketAliases: Record<string, string>;

  /**
   * Adds a ticket. `detectedName` is the name the AI read; when given and the
   * ticket is not a duplicate it is remembered as an alias of the chosen name.
   */
  addTicket: (ticket: Ticket, detectedName?: string) => boolean;
  deleteTicket: (id: string) => void;
  resolveSupermarketName: (name: string) => string;
  importData: (tickets: Ticket[]) => number;
  resetData: () => void;
  setCurrentTicket: (ticket: Ticket | null) => void;
}

const COMPANY_SUFFIXES = new Set(["sa", "s", "a", "sl", "sll", "slu", "sau", "sc"]);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const getSupermarketLookupKey = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((token) => token.length > 0 && !COMPANY_SUFFIXES.has(token))
    .join(" ");

/** Alias first, then exact match on a known store (suffix-insensitive). */
const findCanonicalSupermarketName = (
  value: string,
  knownNames: string[],
  aliases: Record<string, string>
) => {
  const trimmed = normalizeWhitespace(value);
  const key = getSupermarketLookupKey(trimmed);
  if (!key) return trimmed;
  if (aliases[key]) return aliases[key];
  const match = knownNames.find((name) => getSupermarketLookupKey(name) === key);
  return match ?? trimmed;
};

const getTimestamp = (date: string) => {
  const parsed = getDateTimestamp(date);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sanitizeMoney = (value: number) => {
  if (!Number.isFinite(value) || value === 0 || Math.abs(value) >= 1_000_000) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

export const sanitizeTicket = (ticket: Ticket): Ticket => {
  const items = (ticket.items ?? [])
    .map((item) => ({
      ...item,
      category: item.category || "Other",
      price: sanitizeMoney(item.price),
    }))
    .filter((item) => item.price !== 0 && item.name?.trim());
  const itemsTotal = items.reduce((sum, item) => sum + item.price, 0);
  const moneyTotal = sanitizeMoney(ticket.total);

  return {
    ...ticket,
    items,
    total:
      moneyTotal > 0 ? moneyTotal : Math.round(Math.max(itemsTotal, 0) * 100) / 100,
    date: normalizeDateString(ticket.date) || todayISODate(),
  };
};

const ticketSignature = (ticket: Ticket) =>
  [
    ticket.date,
    ticket.total.toFixed(2),
    ...ticket.items
      .map((i) => `${normalizeWhitespace(i.name).toLowerCase()}|${i.price.toFixed(2)}`)
      .sort(),
  ].join("||");

export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const buildProductsFromTickets = (tickets: Ticket[]): Product[] => {
  const productsMap = new Map<string, Product>();

  tickets.forEach((ticket) => {
    ticket.items.forEach((item) => {
      if (item.price <= 0) return; // discount lines carry no product price
      const key = productKeyOf(item.name);
      if (!key) return;

      const priceEntry: ProductPrice = {
        price: item.price,
        date: ticket.date,
        supermarket: ticket.supermarket,
        quantity: item.quantity ?? 1,
      };
      const unitPrice = computeUnitPrice(item.price, item.quantity, item.unit);
      if (unitPrice) {
        priceEntry.unitPrice = unitPrice.unitPrice;
        priceEntry.unit = unitPrice.base;
      }

      const existing = productsMap.get(key);
      if (existing) {
        existing.prices.push(priceEntry);
      } else {
        productsMap.set(key, {
          id: hashString(key),
          name: item.name,
          category: item.category || "Other",
          prices: [priceEntry],
        });
      }
    });
  });

  return Array.from(productsMap.values());
};

const buildSearchResult = (product: Product): ProductSearchResult => {
  const byDate = [...product.prices].sort(
    (a, b) => getTimestamp(a.date) - getTimestamp(b.date)
  );
  const byPrice = [...product.prices].sort((a, b) => a.price - b.price);
  const supermarkets = Array.from(
    new Set(product.prices.map((entry) => entry.supermarket).filter(Boolean))
  );

  return {
    ...product,
    latestPrice: byDate[byDate.length - 1],
    lowestPrice: byPrice[0],
    highestPrice: byPrice[byPrice.length - 1],
    storeCount: supermarkets.length,
    supermarkets,
  };
};

/** Pure search over derived products; call it inside `useMemo`. */
export const searchProducts = (
  products: Product[],
  query: string,
  sortMode: ProductSortMode = "lowest-price"
): ProductSearchResult[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return products
    .filter((product) => product.name.toLowerCase().includes(q))
    .map(buildSearchResult)
    .sort((a, b) => {
      if (sortMode === "latest-price") return a.latestPrice.price - b.latestPrice.price;
      if (sortMode === "recent-purchase") {
        return getTimestamp(b.latestPrice.date) - getTimestamp(a.latestPrice.date);
      }
      return a.lowestPrice.price - b.lowestPrice.price;
    });
};

/** Sanitises, resolves store names and drops duplicates (oldest first wins). */
const normalizeTickets = (
  tickets: Ticket[],
  aliases: Record<string, string>
): Ticket[] => {
  const seen = new Set<string>();
  const knownNames: string[] = [];
  const result: Ticket[] = [];

  [...tickets].reverse().forEach((ticket) => {
    const sanitized = sanitizeTicket(ticket);
    const supermarket = findCanonicalSupermarketName(
      sanitized.supermarket,
      knownNames,
      aliases
    );
    const normalized = { ...sanitized, supermarket };
    const signature = ticketSignature(normalized);
    if (seen.has(signature)) return;
    seen.add(signature);
    if (!knownNames.includes(supermarket)) knownNames.push(supermarket);
    result.push(normalized);
  });

  return result.reverse();
};

export const useStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      products: [],
      currentTicket: null,
      supermarketAliases: {},

      addTicket: (ticket, detectedName) => {
        const state = get();
        const sanitized = sanitizeTicket(ticket);
        if (sanitized.items.length === 0) return false;

        const supermarket = findCanonicalSupermarketName(
          sanitized.supermarket,
          state.tickets.map((entry) => entry.supermarket),
          state.supermarketAliases
        );
        const normalized: Ticket = { ...sanitized, supermarket };

        const signature = ticketSignature(normalized);
        if (state.tickets.some((t) => ticketSignature(t) === signature)) {
          return false;
        }

        const aliases = { ...state.supermarketAliases };
        const aliasKey = getSupermarketLookupKey(detectedName ?? "");
        if (aliasKey) aliases[aliasKey] = supermarket;

        const tickets = [normalized, ...state.tickets];
        set({
          tickets,
          products: buildProductsFromTickets(tickets),
          currentTicket: normalized,
          supermarketAliases: aliases,
        });
        return true;
      },

      deleteTicket: (id) => {
        const tickets = get().tickets.filter((t) => t.id !== id);
        set({ tickets, products: buildProductsFromTickets(tickets) });
      },

      resolveSupermarketName: (name) =>
        findCanonicalSupermarketName(
          name,
          get().tickets.map((entry) => entry.supermarket),
          get().supermarketAliases
        ),

      importData: (incoming) => {
        const state = get();
        const merged = normalizeTickets(
          [...incoming, ...state.tickets],
          state.supermarketAliases
        );
        const added = merged.length - state.tickets.length;
        set({ tickets: merged, products: buildProductsFromTickets(merged) });
        return Math.max(added, 0);
      },

      resetData: () => {
        set({
          tickets: [],
          products: [],
          currentTicket: null,
          supermarketAliases: {},
        });
        useStore.persist.clearStorage();
      },

      setCurrentTicket: (ticket) => set({ currentTicket: ticket }),
    }),
    {
      name: "ticket-storage",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tickets: state.tickets,
        supermarketAliases: state.supermarketAliases,
      }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<TicketState>;
        return {
          tickets: p.tickets ?? [],
          supermarketAliases: p.supermarketAliases ?? {},
        } as TicketState;
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<TicketState>;
        const aliases = persisted.supermarketAliases ?? {};
        const tickets = normalizeTickets(persisted.tickets ?? [], aliases);
        return {
          ...currentState,
          tickets,
          products: buildProductsFromTickets(tickets),
          supermarketAliases: aliases,
          currentTicket: null,
        };
      },
    }
  )
);
