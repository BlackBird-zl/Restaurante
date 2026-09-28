/** DTOs shared by public site, table context and staff (one menu DTO everywhere). */
export type MediaVariant = { role: string; key: string; mime: string; width: number; height: number; bytes?: number };
export type MediaDTO = {
  id: string; key: string; alt: string; width: number; height: number; focalX: number; focalY: number;
  sourceType: 'generated' | 'uploaded' | 'licensed' | 'placeholder'; mime?: string; variants: MediaVariant[];
};
export type CategoryDTO = { id: string; slug: string; name: string; description: string; sortOrder: number };
export type MenuItemDTO = {
  id: string; slug: string; categoryId: string; categorySlug: string; name: string; description: string;
  ingredients: string; allergens: string[]; isVegetarian: boolean; containsAlcohol: boolean; priceCents: number;
  isAvailable: boolean; version: number; sortOrder: number; cover: MediaDTO | null;
};
export type MenuDTO = { categories: CategoryDTO[]; items: MenuItemDTO[] };

export const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Glúten', crustaceos: 'Crustáceos', ovos: 'Ovo', peixe: 'Peixe', amendoins: 'Amendoim', soja: 'Soja',
  leite: 'Leite', frutos_casca_rija: 'Frutos de casca rija', aipo: 'Aipo', mostarda: 'Mostarda', sesamo: 'Sésamo',
  sulfitos: 'Sulfitos', tremoco: 'Tremoço', moluscos: 'Moluscos',
};
export const ALLERGEN_CODES = Object.keys(ALLERGEN_LABELS);

export function allergenText(codes: readonly string[]): string {
  if (!codes.length) return 'Nenhum declarado';
  return codes.map((c) => ALLERGEN_LABELS[c] ?? c).join(', ');
}

/** Accent-insensitive search on product names (Arquitetura §3.1). */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function filterMenu(items: MenuItemDTO[], q: string): MenuItemDTO[] {
  const n = normalizeSearch(q.slice(0, 80));
  if (!n) return items;
  return items.filter((i) => normalizeSearch(i.name).includes(n));
}
