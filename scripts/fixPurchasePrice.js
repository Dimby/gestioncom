const { readDb, writeDb } = require("../db");

async function fixPurchasePrice() {

  const data = await readDb();

  let updated = 0;

  data.sales.forEach(sale => {

    // si déjà présent on ne touche pas
    if (sale.purchasePrice !== undefined) return;

    // retrouver le produit dans le stock
    const stockItem = data.stocks.find(s => s.name === sale.produit);

    if (stockItem) {
      sale.purchasePrice = stockItem.purchasePrice || 0;
    } else {
      sale.purchasePrice = 0;
    }

    updated++;
  });

  await writeDb(data);

  console.log(`Migration terminée : ${updated} ventes mises à jour`);
}

fixPurchasePrice();