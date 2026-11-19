import type { Catalog } from "../types";

export const STORAGE_KEY = "day-to-day-catalog-draft-v1";
export const SESSION_KEY = "day-to-day-admin-session";

export async function loadPublishedCatalog(): Promise<Catalog> {
  const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load public/catalog.json");
  return (await response.json()) as Catalog;
}

export function loadAdminDraft(published: Catalog): Catalog {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Catalog) : structuredClone(published);
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
