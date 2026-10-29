import test from "node:test";
import assert from "node:assert/strict";
import { computeUnitPrice, hashString, productKeyOf } from "../utils/productKey";
import { extractJsonObject, parseReceipt, toNumber } from "../utils/receiptSchema";
import { getPriceMovers, roundShares } from "../utils/insights";
import { normalizeDateString } from "../utils/dates";

test("toNumber handles european and us formats", () => {
  assert.equal(toNumber("1,50"), 1.5);
  assert.equal(toNumber("€12,50"), 12.5);
  assert.equal(toNumber("1.234,56"), 1234.56);
  assert.equal(toNumber("1,234.56"), 1234.56);
  assert.equal(toNumber("abc"), null);
});

test("extractJsonObject ignores fences and prose", () => {
  const text = 'Sure!\n```json\n{"a": {"b": "}"}, "c": 1}\n```\nDone';
  assert.deepEqual(JSON.parse(extractJsonObject(text)!), { a: { b: "}" }, c: 1 });
  assert.equal(extractJsonObject("no json"), null);
});

test("parseReceipt coerces and validates", () => {
  const r = parseReceipt({
    supermarket: " Mercadona ",
    date: "05/10/2026",
    total: "3,00",
    items: [
      { name: "Leche", price: "1,20", quantity: "1", unit: "l", category: "dairy" },
      { name: "", price: 1 },
      { name: "Pan", price: 1.8 },
    ],
  })!;
  assert.equal(r.supermarket, "Mercadona");
  assert.equal(r.date, "2026-10-05");
  assert.equal(r.total, 3);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].category, "Dairy");
  assert.equal(r.items[1].category, "Other");
  assert.equal(parseReceipt({ items: [] }), null);
  assert.equal(parseReceipt({}), null);
});

test("computeUnitPrice converts and guards", () => {
  assert.deepEqual(computeUnitPrice(1, 500, "g"), { unitPrice: 2, base: "kg" });
  assert.deepEqual(computeUnitPrice(1.5, 1, "L"), { unitPrice: 1.5, base: "l" });
  assert.deepEqual(computeUnitPrice(3, 6, "pcs"), { unitPrice: 0.5, base: "unit" });
  assert.equal(computeUnitPrice(1, 0, "kg"), null);
  assert.equal(computeUnitPrice(1, 2, "furlong"), null);
});

test("productKeyOf merges spelling variants", () => {
  assert.equal(productKeyOf("Leche Entera 1L"), productKeyOf("LECHE ENTERA"));
  assert.equal(productKeyOf("Café"), "cafe");
  assert.notEqual(hashString("a"), hashString("b"));
});

test("roundShares sums to 100", () => {
  const shares = roundShares([1, 1, 1]);
  assert.equal(shares.reduce((a, b) => a + b, 0), 100);
});

test("getPriceMovers prefers same store", () => {
  const price = (p: number, date: string, supermarket: string) => ({ price: p, date, supermarket });
  const movers = getPriceMovers([
    {
      id: "1",
      name: "Milk",
      category: "Dairy",
      prices: [
        price(1, "2026-01-01", "A"),
        price(2, "2026-02-01", "B"),
        price(1.5, "2026-03-01", "A"),
      ],
    },
  ]);
  assert.equal(movers.length, 1);
  assert.equal(movers[0].delta, 0.5);
  assert.equal(movers[0].sameStore, true);
});

test("normalizeDateString", () => {
  assert.equal(normalizeDateString("2026-10-05T10:00"), "2026-10-05");
  assert.equal(normalizeDateString("nope"), "");
});
