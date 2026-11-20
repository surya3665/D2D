import type { Catalog, LaundryService } from "../types";

export const STORAGE_KEY = "day-to-day-catalog-draft-v1";
export const SESSION_KEY = "day-to-day-admin-session";

const defaultServices: LaundryService[] = [
  { id: "steam-ironing", name: "Steam Ironing", icon: "sparkles", active: true, sortOrder: 0, topicId: "clothing", priceKey: "steamIroning" },
  { id: "wash-ironing", name: "Wash & Ironing", icon: "package", active: true, sortOrder: 1, topicId: "clothing", priceKey: "wash" },
  { id: "dry-cleaning", name: "Dry Cleaning", icon: "shirt", active: true, sortOrder: 2, topicId: "clothing", priceKey: "dryCleaning" },
  { id: "saree-roll-polishing", name: "Saree Roll Polishing", icon: "roll", active: true, sortOrder: 3, topicId: "clothing", priceKey: "sareeRollPolishing" },
  { id: "household-laundry", name: "Household Laundry", icon: "basket", active: true, sortOrder: 4, topicId: "household", priceKey: "amountRate" },
  { id: "wash-and-starch", name: "Wash & Starch", icon: "spray", active: true, sortOrder: 5, topicId: "clothing", priceKey: "washAndStarch" },
];

export function normalizeCatalog(input: Catalog): Catalog {
  const catalog = structuredClone(input);
  const services = (catalog.services?.length ? catalog.services : defaultServices).map((service) => ({ ...service }));
  for (const service of services) {
    const topic = catalog.topics.find((entry) => entry.id === service.topicId);
    if (!topic || topic.columns.some((column) => column.key === service.priceKey)) continue;
    const legacyLabels: Record<string, string> = { steamIroning: "Steam Ironing", sareeRollPolishing: "Saree Roll Polishing" };
    topic.columns.push({ key: service.priceKey, label: legacyLabels[service.priceKey] ?? service.name });
    topic.items = topic.items.map((item) => ({ ...item, prices: { ...item.prices, [service.priceKey]: "—" } }));
  }
  catalog.services = services;
  for (const topic of catalog.topics) {
    topic.items = topic.items.map((item, index) => ({
      ...item,
      tamilName: item.tamilName ?? "",
      group: item.group ?? (topic.id === "household" ? "household" : "clothing"),
      active: item.active ?? true,
      sortOrder: item.sortOrder ?? index,
    }));
    topic.active ??= true;
  }
  return catalog;
}

export async function loadPublishedCatalog(): Promise<Catalog> {
  const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load public/catalog.json");
  return normalizeCatalog((await response.json()) as Catalog);
}

export function loadAdminDraft(published: Catalog): Catalog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeCatalog(JSON.parse(raw) as Catalog) : structuredClone(published);
  } catch {
    return structuredClone(published);
  }
}

export function saveAdminDraft(catalog: Catalog): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

export function downloadCatalog(catalog: Catalog): void {
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "catalog.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function makeId(value: string): string {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "item"}-${Math.random().toString(36).slice(2, 7)}`;
}
