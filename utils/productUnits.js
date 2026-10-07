const PRODUCT_UNITS = ["piece", "boite", "litre", "kg", "metre", "rouleau", "paquet"];

function normalizeUnit(value) {
  const unit = String(value || "").trim().toLocaleLowerCase("fr-FR");
  if (/^pi[eè]ces?$/.test(unit)) return "piece";
  if (/^bo[iî]tes?$/.test(unit)) return "boite";
  if (/^litres?$/.test(unit)) return "litre";
  if (/^(kg|kilogrammes?)$/.test(unit)) return "kg";
  if (/^(m|m[eè]tres?)$/.test(unit)) return "metre";
  if (/^rouleaux?$/.test(unit)) return "rouleau";
  if (/^paquets?$/.test(unit)) return "paquet";
  return PRODUCT_UNITS.includes(unit) ? unit : "";
}

function parseLegacyPieces(value) {
  const match = String(value ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s(]+)?/);
  if (!match) return { piecesQuantity: 1, piecesUnit: "piece" };

  const parsedQuantity = Number(match[1].replace(",", "."));
  const piecesQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0
    ? parsedQuantity
    : 1;
  const piecesUnit = normalizeUnit(match[2]) || "piece";
  return { piecesQuantity, piecesUnit };
}

function normalizeProductUnits(product = {}) {
  const legacy = parseLegacyPieces(product.pieces);
  const quantity = Number(product.piecesQuantity);
  const piecesQuantity = Number.isFinite(quantity) && quantity > 0
    ? quantity
    : legacy.piecesQuantity;
  const piecesUnit = normalizeUnit(product.piecesUnit) || legacy.piecesUnit;
  return { piecesQuantity, piecesUnit };
}

function calculatePurchasePrice(purchaseTotalPrice, piecesQuantity) {
  const total = Number(purchaseTotalPrice);
  const quantity = Number(piecesQuantity);
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }
  return Math.ceil(total / quantity);
}

module.exports = {
  PRODUCT_UNITS,
  normalizeProductUnits,
  calculatePurchasePrice,
  parseLegacyPieces
};
