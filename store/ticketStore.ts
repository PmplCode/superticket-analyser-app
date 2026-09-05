import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  normalizeDateString,
  getDateTimestamp,
  todayISODate,
} from "../utils/dates";

export interface ProductPrice {
  price: number;
  unit?: string;
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

export interface Ticket {
  id: string;
  date: string;
  supermarket: string;
  items: { name: string; price: number; quantity?: number; unit?: string; category: string }[];
  total: number;
  imageUri?: string;
}

interface TicketState {
  tickets: Ticket[];
  products: Product[];
  currentTicket: Ticket | null;
  loading: boolean;
  supermarketAliases: Record<string, string>;

  addTicket: (ticket: Ticket) => boolean;
  rememberSupermarketName: (rawName: string, chosenName: string) => void;
  resolveSupermarketName: (name: string) => string;
  resetData: () => void;
  setCurrentTicket: (ticket: Ticket | null) => void;
  setLoading: (loading: boolean) => void;
  searchProducts: (
    query: string,
    sortMode?: ProductSortMode
  ) => ProductSearchResult[];
}

const COMPANY_SUFFIXES = new Set([
  "sa",
  "s",
  "a",
  "sl",
  "sll",
  "slu",
  "slu.",
  "sau",
  "sc",
]);

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const tokenizeSupermarketName = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !COMPANY_SUFFIXES.has(token));

const getSupermarketLookupKey = (value: string) =>
  tokenizeSupermarketName(value).join(" ");

const findCanonicalSupermarketName = (
  value: string,
  knownNames: string[],
  aliases: Record<string, string>
) => {
  const trimmedValue = normalizeWhitespace(value);
  const lookupKey = getSupermarketLookupKey(trimmedValue);

  if (!lookupKey) {
    return trimmedValue;
  }

  if (aliases[lookupKey]) {
    return aliases[lookupKey];
  }

  const knownEntries = knownNames.map((knownName) => ({
    name: knownName,
    key: getSupermarketLookupKey(knownName),
    tokens: tokenizeSupermarketName(knownName),
  }));

  const exactMatch = knownEntries.find((entry) => entry.key === lookupKey);
  if (exactMatch) {
    return exactMatch.name;
  }

  const targetTokens = lookupKey.split(" ");
  const subsetMatches = knownEntries
    .filter((entry) => {
      if (!entry.tokens.length) {
        return false;
      }

      const targetSubset = targetTokens.every((token) =>
        entry.tokens.includes(token)
      );
      const knownSubset = entry.tokens.every((token) =>
        targetTokens.includes(token)
      );

      return targetSubset || knownSubset;
    })
    .sort((a, b) => b.tokens.length - a.tokens.length || b.name.length - a.name.length);

  if (subsetMatches.length > 0) {
    return subsetMatches[0].name;
  }

  return trimmedValue;
};

const getTimestamp = (date: string) => {
  const parsed = getDateTimestamp(date);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sanitizeMoney = (value: number) => {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    value >= 1_000_000
  ) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

const sanitizeTicket = (ticket: Ticket): Ticket => {
  const items = ticket.items
    .map((item) => ({ ...item, price: sanitizeMoney(item.price) }))
    .filter((item) => item.price > 0);
  const itemsTotal = items.reduce((sum, item) => sum + item.price, 0);
  const moneyTotal = sanitizeMoney(ticket.total);

  return {
    ...ticket,
    items,
    total: moneyTotal > 0 ? moneyTotal : itemsTotal,
    date: normalizeDateString(ticket.date) || todayISODate(),
  };
};

const getSortedPricesByDate = (prices: ProductPrice[]) =>
  [...prices].sort((a, b) => getTimestamp(a.date) - getTimestamp(b.date));

const buildProductSearchResult = (product: Product): ProductSearchResult => {
  const pricesByDate = getSortedPricesByDate(product.prices);
  const latestPrice = pricesByDate[pricesByDate.length - 1];
  const lowestPrice = [...product.prices].sort((a, b) => a.price - b.price)[0];
  const highestPrice = [...product.prices].sort((a, b) => b.price - a.price)[0];
  const supermarkets = Array.from(
    new Set(product.prices.map((entry) => entry.supermarket).filter(Boolean))
  );

  return {
    ...product,
    latestPrice,
    lowestPrice,
    highestPrice,
    storeCount: supermarkets.length,
    supermarkets,
  };
};

const areTicketItemsEquivalent = (
  currentItems: Ticket["items"],
  nextItems: Ticket["items"]
) => {
  if (currentItems.length !== nextItems.length) {
    return false;
  }

  const normalizeItem = (item: Ticket["items"][number]) =>
    `${normalizeWhitespace(item.name).toLowerCase()}|${item.price.toFixed(2)}`;

  const currentSignature = [...currentItems]
    .map(normalizeItem)
    .sort()
    .join("||");
  const nextSignature = [...nextItems]
    .map(normalizeItem)
    .sort()
    .join("||");

  return currentSignature === nextSignature;
};

const isDuplicateTicket = (existingTicket: Ticket, nextTicket: Ticket) =>
  existingTicket.date === nextTicket.date &&
  Number(existingTicket.total.toFixed(2)) === Number(nextTicket.total.toFixed(2)) &&
  areTicketItemsEquivalent(existingTicket.items, nextTicket.items);

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).substr(0, 8);
};

const normalizeItemKey = (name: string) =>
  name.toLowerCase().trim();

const buildProductsFromTickets = (tickets: Ticket[]) => {
  const productsMap = new Map<string, Product>();

  tickets.forEach((ticket) => {
    ticket.items.forEach((item) => {
      const key = normalizeItemKey(item.name);
      const existingProduct = productsMap.get(key);

      const priceEntry: ProductPrice = {
        price: item.price,
        date: ticket.date,
        supermarket: ticket.supermarket,
      };

      // Compute unit price if quantity and unit are known
      if (item.quantity && item.unit) {
        const quantity = item.quantity;
        const unit = item.unit.toLowerCase();
        let convertedQuantity = quantity;
        // Convert to kg base for unit price comparison
        if (unit === "kg" || unit === "kilogram") {
          convertedQuantity = quantity;
        } else if (unit === "g" || unit === "gram") {
          convertedQuantity = quantity / 1000;
        } else if (unit === "ml" || unit === "milliliter") {
          convertedQuantity = quantity / 1000;
        } else if (unit === "l" || unit === "liter") {
          convertedQuantity = quantity;
        } else if (unit === "pcs" || unit === "piece" || unit === "units") {
          convertedQuantity = 1; // price per unit already
        }
        priceEntry.unitPrice = Math.round((item.price / convertedQuantity) * 100) / 100;
        priceEntry.unit = item.unit;
        priceEntry.quantity = item.quantity;
      } else {
        // Default: assume 1 each, no unit price computed
        priceEntry.quantity = 1;
        priceEntry.unit = "each";
      }

      if (existingProduct) {
        // Keep one entry per purchase: same price/supermarket/date/quantity/unit
        const alreadyHas = existingProduct.prices.some(
          (p) =>
            p.price === priceEntry.price &&
            p.supermarket === priceEntry.supermarket &&
            p.date === priceEntry.date &&
            p.quantity === priceEntry.quantity &&
            p.unit === priceEntry.unit
        );
        if (!alreadyHas) {
          existingProduct.prices.push(priceEntry);
        }
      } else {
        productsMap.set(key, {
          id: hashString(key),
          name: item.name,
          category: item.category,
          prices: [priceEntry],
        });
      }
    });
  });

return Array.from(productsMap.values(), (product) => ({
  ...product,
}));
};

const normalizePersistedData = (
  tickets: Ticket[],
  aliases: Record<string, string>
) => {
  const canonicalTickets: Ticket[] = [];
  const nextAliases = { ...aliases };

  [...tickets]
    .reverse()
    .forEach((ticket) => {
      const sanitized = sanitizeTicket(ticket);
      const canonicalSupermarket = findCanonicalSupermarketName(
        sanitized.supermarket,
        canonicalTickets.map((entry) => entry.supermarket),
        nextAliases
      );

      const normalizedTicket = {
        ...sanitized,
        supermarket: canonicalSupermarket,
      };

      const lookupKey = getSupermarketLookupKey(ticket.supermarket);
      if (lookupKey) {
        nextAliases[lookupKey] = canonicalSupermarket;
      }

      if (!canonicalTickets.some((entry) => isDuplicateTicket(entry, normalizedTicket))) {
        canonicalTickets.push(normalizedTicket);
      }
    });

  const normalizedTickets = canonicalTickets.reverse();

  return {
    tickets: normalizedTickets,
    products: buildProductsFromTickets(normalizedTickets),
    supermarketAliases: nextAliases,
  };
};

export const useStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      products: [],
      currentTicket: null,
      loading: false,
      supermarketAliases: {},

      addTicket: (ticket) => {
        const sanitized = sanitizeTicket(ticket);
        const resolvedSupermarket = findCanonicalSupermarketName(
          sanitized.supermarket,
          get().tickets.map((entry) => entry.supermarket),
          get().supermarketAliases
        );

        const normalizedTicket: Ticket = {
          ...sanitized,
          supermarket: resolvedSupermarket,
        };

        const isDuplicate = get().tickets.some((existingTicket) =>
          isDuplicateTicket(existingTicket, normalizedTicket)
        );

        if (isDuplicate) {
          return false;
        }

        set((state) => {
          const nextAliases = { ...state.supermarketAliases };
          const lookupKey = getSupermarketLookupKey(ticket.supermarket);

          if (lookupKey) {
            nextAliases[lookupKey] = resolvedSupermarket;
          }

          const nextTickets = [normalizedTicket, ...state.tickets];

          return {
            tickets: nextTickets,
            products: buildProductsFromTickets(nextTickets),
            currentTicket: normalizedTicket,
            supermarketAliases: nextAliases,
          };
        });

        return true;
      },

      rememberSupermarketName: (rawName, chosenName) => {
        const trimmedChosenName = normalizeWhitespace(chosenName);
        const lookupKey = getSupermarketLookupKey(rawName);

        set((state) => {
          const nextAliases = { ...state.supermarketAliases };

          if (lookupKey) {
            nextAliases[lookupKey] = trimmedChosenName;
          }

          const nextTickets = state.tickets.map((ticket) => {
            const canonicalName = findCanonicalSupermarketName(
              ticket.supermarket,
              [trimmedChosenName],
              nextAliases
            );

            return {
              ...ticket,
              supermarket: canonicalName,
            };
          });

          return {
            tickets: nextTickets,
            products: buildProductsFromTickets(nextTickets),
            supermarketAliases: nextAliases,
          };
        });
      },

      resolveSupermarketName: (name) =>
        findCanonicalSupermarketName(
          name,
          get().tickets.map((entry) => entry.supermarket),
          get().supermarketAliases
        ),

      resetData: () =>
        set({
          tickets: [],
          products: [],
          currentTicket: null,
          loading: false,
          supermarketAliases: {},
        }),

      setCurrentTicket: (ticket) => set({ currentTicket: ticket }),
      setLoading: (loading) => set({ loading }),

      searchProducts: (query, sortMode = "lowest-price") => {
        if (!query) return [];

        const normalizedQuery = query.trim().toLowerCase();

        return get()
          .products
          .filter((product) =>
            product.name.toLowerCase().includes(normalizedQuery)
          )
          .map(buildProductSearchResult)
          .sort((a, b) => {
            if (sortMode === "latest-price") {
              return a.latestPrice.price - b.latestPrice.price;
            }

            if (sortMode === "recent-purchase") {
              return (
                getTimestamp(b.latestPrice.date) - getTimestamp(a.latestPrice.date)
              );
            }

            return a.lowestPrice.price - b.lowestPrice.price;
          });
      },
    }),
    {
      name: "ticket-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tickets: state.tickets,
        products: state.products,
        supermarketAliases: state.supermarketAliases,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TicketState> | undefined;
        const normalized = normalizePersistedData(
          persisted?.tickets ?? [],
          persisted?.supermarketAliases ?? {}
        );

        return {
          ...currentState,
          ...normalized,
          currentTicket: null,
          loading: false,
        };
      },
    }
  )
);
