/**
 * Retourne le label lisible pour une forme pharmaceutique.
 * @param {string} form - La valeur brute (ex: "tablet", "syrup", ...)
 * @returns {string} - Le label à afficher (ex: "CPR", "SIROP", ...)
 */
export function getFormLabel(form) {
  const map = PRODUCT_CATEGORIES;
  return map[form] || form;
}

export const PRODUCT_CATEGORIES = {
  envelope: "ENV",
  folder: "DOS",
  office_paper: "PAP",
  special_paper: "BRISTOL",
  photo_paper: "PHOTO",
  colored_office_paper: "COLOR",
  plastic_sleeve: "POCH",
  spiral_binding: "SPI",
  book_cover_film: "COUV",
  lamination_film: "PLAST",
  staple: "AGRA",
  notepad: "BLOCNOTE",
  supplies: "FOURNITURE SCOLAIRE",
  empty: "-"
};

export function getMarginRate(purchase) {
  if (purchase < 500) return 2;
  if (purchase < 2000) return 1.7;
  return 1.5;
}

export function calculateSalePrice(purchase) {
  return Math.round(purchase * getMarginRate(purchase));
}