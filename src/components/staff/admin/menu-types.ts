export type AdminItem = {
  id: string; slug: string; categoryId: string; stationId: string; name: string; description: string; ingredients: string;
  allergens: string[]; isVegetarian: boolean; containsAlcohol: boolean; priceCents: number; isVisible: boolean; isAvailable: boolean;
  sortOrder: number; archivedAt: string | null; publishedAt: string | null; version: number; updatedAt: string; orderCount: number;
  cover: { id: string; key: string; alt: string; sourceType: string; approved: boolean } | null;
};
export type AdminCategory = { id: string; slug: string; name: string; description: string; sortOrder: number; isVisible: boolean; archivedAt: string | null; version: number; itemCount: number };
export type AdminStation = { id: string; code: string; name: string; kind: 'kitchen' | 'bar'; active: boolean };
export type AdminMenu = { categories: AdminCategory[]; stations: AdminStation[]; items: AdminItem[]; featuredWarnings: string[] };
export type AdminMedia = { id: string; key: string; alt: string; purpose: string; width: number; height: number; sourceType: string; approved: boolean; visibility: string; archived: boolean; createdAt: string; variants: { role: string; key: string; mime: string; width: number }[] | null };
