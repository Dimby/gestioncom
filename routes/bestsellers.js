// Fichier: routes/bestsellers.js
const express = require("express");
const { readDb } = require("../db"); // <-- MODIFIÉ

const router = express.Router();

router.get("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    const sales = data.sales || [];
    const stocks = data.stocks || [];
    const stockById = {};
    const stockByName = {};
    stocks.forEach(product => {
      stockById[String(product.id)] = product;
      stockByName[product.name] = product;
    });
    const productSales = {};
    sales.forEach(sale => {
      if (!sale.produit && sale.stockId == null) return;
      const stockItem = (sale.stockId != null && stockById[String(sale.stockId)])
        || stockByName[sale.produit];
      const key = stockItem ? String(stockItem.id) : (sale.stockId != null ? String(sale.stockId) : sale.produit);
      const quantity = sale.quantity || 1;
      if (!productSales[key]) {
        productSales[key] = {
          name: stockItem ? stockItem.name : sale.produit,
          totalQuantity: 0,
          totalRevenue: 0,
          category: (stockItem && stockItem.category) || 'Non catégorisé',
          stock: stockItem ? (stockItem.stock || 0) : 0,
          unitPrice: stockItem ? (stockItem.salePrice || 0) : 0
        };
      }
      productSales[key].totalQuantity += quantity;
      const price = sale.unitPrice || sale.salePrice || 0;
      productSales[key].totalRevenue += quantity * price;
    });
    let bestsellers = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity);
    res.json(bestsellers);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des meilleures ventes:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des meilleures ventes" });
  }
});

module.exports = router;