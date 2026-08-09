export type Slot = {
  id: string;
  label: string;
  type: "aula" | "intervalo" | "almoco";
};

export const DAYS = [
  { id: "seg", label: "Segunda-feira" },
  { id: "ter", label: "Terça-feira" },
  { id: "qua", label: "Quarta-feira" },
  { id: "qui", label: "Quinta-feira" },
  { id: "sex", label: "Sexta-feira" },
] as const;

export const SLOTS: Slot[] = [
  { id: "0700", label: "07:00 - 08:00", type: "aula" },
  { id: "0800", label: "08:00 - 09:00", type: "aula" },
  { id: "0900", label: "09:00 - 09:15", type: "intervalo" },
  { id: "0915", label: "09:15 - 10:15", type: "aula" },
  { id: "1015", label: "10:15 - 11:15", type: "aula" },
  { id: "1115", label: "11:15 - 12:15", type: "aula" },
  { id: "1215", label: "12:15 - 13:15", type: "almoco" },
  { id: "1300", label: "13:00 - 14:00", type: "aula" },
  { id: "1400", label: "14:00 - 15:00", type: "aula" },
  { id: "1500", label: "15:00 - 15:15", type: "intervalo" },
  { id: "1515", label: "15:15 - 16:15", type: "aula" },
];

export type Booking = {
  professor: string;
  turma: string;
  disciplina?: string;
  criadoEm: string;
};

export type WeekData = Record<string, Booking>; // key: `${dayId}|${slotId}`

export const ADMIN_PASSWORD = "Landri26@";
const PREFIX = "ceti-lab-agenda:";

/** Monday of the current week, ISO yyyy-mm-dd */
export function currentWeekKey(d = new Date()): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // 0 = monday
  date.setDate(date.getDate() - day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function weekRangeLabel(weekKey: string): string {
  const [y, m, d] = weekKey.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  const f = (x: Date) =>
    `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`;
  return `${f(start)} a ${f(end)}`;
}

export function loadWeek(weekKey: string): WeekData {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PREFIX + weekKey) ?? "{}") as WeekData;
  } catch {
    return {};
  }
}

export function saveWeek(weekKey: string, data: WeekData) {
  localStorage.setItem(PREFIX + weekKey, JSON.stringify(data));
}

export function listWeeks(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
  }
  return keys.sort().reverse();
}
