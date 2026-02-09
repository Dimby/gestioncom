/**
 * Retourne le label lisible pour une forme pharmaceutique.
 * @param {string} form - La valeur brute (ex: "tablet", "syrup", ...)
 * @returns {string} - Le label à afficher (ex: "CPR", "SIROP", ...)
 */
export function getFormLabel(form) {
  const map = {
    envelope: "ENV",              // Enveloppe
    folder: "DOS",                // Chemise / Dossier
    office_paper: "PAP",          // Papier bureau
    special_paper: "BRISTOL",     // Papier bristol
    photo_paper: "PHOTO",         // Papier glacé photo
    colored_office_paper: "COLOR",// Papier couleur
    plastic_sleeve: "POCH",       // Pochette perforée
    spiral_binding: "SPI",         // Spirales de reliure
    book_cover_film: "COUV",       // Films plastiques pour couverture livre
    lamination_film: "PLAST",      // Films plastiques pour plastification
    staple: "AGRA",                // Agrafe
    notepad: "BLOCNOTE",
    supplies: "FOURNITURE SCOLAIRE",
    empty: "-"
  };
  return map[form] || form;
}