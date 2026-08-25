export const CATEGORIES = ["ELECTRONICS", "FASHION", "HOME", "SPORTS", "OTHER"];

export const ELECTRONICS_SUBCATEGORIES = [
  "MONITOR",
  "PROCESSOR",
  "GRAPHICS_CARD",
  "MOTHERBOARD",
  "RAM",
  "STORAGE",
  "POWER_SUPPLY_UPS",
  "CASING",
  "OTHER_COMPONENTS",
];

export function formatCategoryName(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CATEGORY_IMAGES: Record<string, string> = {
  MONITOR: "https://cdn-icons-png.flaticon.com/512/1299/1299142.png",
  PROCESSOR: "https://cdn-icons-png.flaticon.com/512/2920/2920277.png",
  GRAPHICS_CARD: "https://cdn-icons-png.flaticon.com/512/2721/2721278.png",
  MOTHERBOARD: "https://cdn-icons-png.flaticon.com/512/3208/3208752.png",
  RAM: "https://cdn-icons-png.flaticon.com/512/689/689396.png",
  STORAGE: "https://cdn-icons-png.flaticon.com/512/2906/2906274.png",
  POWER_SUPPLY_UPS: "https://cdn-icons-png.flaticon.com/512/2910/2910761.png",
  CASING:
    "https://images.icon-icons.com/4172/PNG/512/electronics_pc_case_tower_computer_icon_261971.png",
  OTHER_COMPONENTS:
    "https://cdn4.iconfinder.com/data/icons/computer-hardware-591/64/17.EQUIPMENT_COMPUTER-Device-_Electronic-_Equipment-_Technology-cpu-ram-fan-Microchip-chip-Transistor-1024.png",
};
