
const Sale = require("../models/sale");
const Stock = require("../models/stock");


async function fixPurchasePrice() {
  const sales = await Sale.find();
  let updated = 0;
  for (const sale of sales) {
    if (sale.purchasePrice !== undefined) continue;
    const stockItem = await Stock.findOne({ name: sale.produit });
    if (stockItem) {
      sale.purchasePrice = stockItem.purchasePrice || 0;
    } else {
      sale.purchasePrice = 0;
    }
    await sale.save();
    updated++;
  }
  console.log(`Migration terminée : ${updated} ventes mises à jour`);
}

fixPurchasePrice();