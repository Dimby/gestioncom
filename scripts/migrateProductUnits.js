const fs = require("fs");
const path = require("path");
const { readDb, writeDb } = require("../db");
const {
  normalizeProductUnits,
  calculatePurchasePrice
} = require("../utils/productUnits");

const productsPath = path.join(__dirname, "../public/produits.js");

async function migrateProductUnits() {
  const catalog = JSON.parse(fs.readFileSync(productsPath, "utf8"));
  const products = catalog.produits || [];
  const productsById = new Map();

  products.forEach(product => {
    const units = normalizeProductUnits(product);
    product.piecesQuantity = units.piecesQuantity;
    product.piecesUnit = units.piecesUnit;
    product.purchasePrice = calculatePurchasePrice(
      product.purchaseTotalPrice || 0,
      units.piecesQuantity
    );
    delete product.pieces;
    productsById.set(String(product.id), product);
  });

  const data = await readDb();
  let stocksUpdated = 0;
  let ordersUpdated = 0;

  (data.stocks || []).forEach(stock => {
    const product = productsById.get(String(stock.id));
    const units = normalizeProductUnits(product || stock);
    stock.piecesQuantity = units.piecesQuantity;
    stock.piecesUnit = units.piecesUnit;
    delete stock.pieces;
    if (product) {
      stock.purchasePrice = product.purchasePrice;
      stock.purchaseTotalPrice = product.purchaseTotalPrice || 0;
    } else {
      stock.purchasePrice = calculatePurchasePrice(
        stock.purchaseTotalPrice || 0,
        units.piecesQuantity
      );
    }
    stocksUpdated++;
  });

  (data.orders || []).forEach(order => {
    const product = productsById.get(String(order.productId));
    const source = order.pieces != null || order.piecesQuantity != null
      ? order
      : (product || order);
    const units = normalizeProductUnits(source);
    order.piecesQuantity = units.piecesQuantity;
    order.piecesUnit = units.piecesUnit;
    delete order.pieces;
    ordersUpdated++;
  });

  fs.writeFileSync(productsPath, JSON.stringify(catalog, null, 2));
  await writeDb(data);

  console.log(
    `Migration terminée : ${products.length} produits, ${stocksUpdated} stocks et ${ordersUpdated} commandes mis à jour.`
  );
}

migrateProductUnits().catch(error => {
  console.error("Erreur lors de la migration des unités produit :", error);
  process.exitCode = 1;
});
