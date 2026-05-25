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

export const CATEGORY_IMAGES: Record<string, string> = {
  LAPTOP: 'https://cdn-icons-png.flaticon.com/512/689/689396.png',
  DESKTOP: 'https://cdn-icons-png.flaticon.com/512/3474/3474360.png',
  MONITOR: 'https://cdn-icons-png.flaticon.com/512/1299/1299142.png',
  PROCESSOR: 'https://cdn-icons-png.flaticon.com/512/2920/2920277.png',
  GRAPHICS_CARD: 'https://cdn-icons-png.flaticon.com/512/2721/2721278.png',
  MOTHERBOARD: 'https://cdn-icons-png.flaticon.com/512/3208/3208752.png',
  RAM: 'https://cdn-icons-png.flaticon.com/512/689/689396.png',
  STORAGE: 'https://cdn-icons-png.flaticon.com/512/2906/2906274.png',
  MOBILE: 'https://cdn-icons-png.flaticon.com/512/186/186240.png',
  TABLET: 'https://cdn-icons-png.flaticon.com/512/3018/3018715.png',
};