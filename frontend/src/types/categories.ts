export const CATEGORIES = [
  'ELECTRONICS',
  'FASHION',
  'HOME',
  'SPORTS',
  'OTHER'
];

export const ELECTRONICS_SUBCATEGORIES = [
  'LAPTOP',
  'DESKTOP',
  'MONITOR',
  'PROCESSOR',
  'GRAPHICS_CARD',
  'MOTHERBOARD',
  'RAM',
  'STORAGE',
  'MOBILE',
  'TABLET',
  'POWER_SUPPLY_UPS',
];

export function formatCategoryName(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}