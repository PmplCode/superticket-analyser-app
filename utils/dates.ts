const pad = (value: number) => value.toString().padStart(2, "0");

export const normalizeDateString = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const s = value.trim();
  if (!s) return "";

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
      parsed.getDate()
    )}`;
  }

  return "";
};

export const parseDate = (value: string): Date => {
  const iso = normalizeDateString(value);
  if (!iso) return new Date(NaN);
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getDateTimestamp = (value: string): number =>
  parseDate(value).getTime();

export const todayISODate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};