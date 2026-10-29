import { Ticket, newId, sanitizeTicket } from "../store/ticketStore";
import { parseReceipt } from "./receiptSchema";

const csvCell = (value: string | number) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const ticketsToCsv = (tickets: Ticket[]) => {
  const rows = [
    ["date", "supermarket", "item", "category", "quantity", "unit", "price", "ticket_total"],
  ];
  tickets.forEach((t) =>
    t.items.forEach((i) =>
      rows.push([
        t.date,
        t.supermarket,
        i.name,
        i.category,
        i.quantity ?? "",
        i.unit ?? "",
        i.price.toFixed(2),
        t.total.toFixed(2),
      ] as string[])
    )
  );
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
};

export const ticketsToJson = (tickets: Ticket[]) =>
  JSON.stringify({ version: 1, tickets }, null, 2);

/** Parses a backup produced by `ticketsToJson`; returns null when invalid. */
export const ticketsFromJson = (text: string): Ticket[] | null => {
  try {
    const data = JSON.parse(text);
    const list: unknown[] = Array.isArray(data) ? data : data?.tickets;
    if (!Array.isArray(list)) return null;
    const result: Ticket[] = [];
    list.forEach((entry) => {
      const obj = entry as Record<string, unknown>;
      const parsed = parseReceipt(obj);
      if (!parsed) return;
      result.push(
        sanitizeTicket({
          id: typeof obj.id === "string" && obj.id ? obj.id : newId(),
          date: parsed.date,
          supermarket: parsed.supermarket || "Unknown",
          items: parsed.items,
          total: parsed.total,
        })
      );
    });
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
};
