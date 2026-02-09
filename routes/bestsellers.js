// Fichier: routes/bestsellers.js
const express = require("express");
const { readDb } = require("../db"); // <-- MODIFIÉ

const router = express.Router();

router.get("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    const sales = data.sales || [];
    const stocks = data.stocks || [];
    
    // Le reste de votre logique de calcul est correcte
    const stockDict = {};
    stocks.forEach(product => {
      stockDict[product.name] = {
        category: product.category || 'Non catégorisé',
        stock: product.stock || 0,
        unitPrice: product.salePrice || 0
      };
    });
    const productSales = {};
    sales.forEach(sale => {
      if (!sale.produit) return;
      const productName = sale.produit;
      const quantity = sale.quantity || 1;
      if (!productSales[productName]) {
        const stockInfo = stockDict[productName] || { category: 'Non catégorisé', stock: 0, unitPrice: 0 };
        productSales[productName] = {
          name: productName,
          totalQuantity: 0,
          totalRevenue: 0,
          category: stockInfo.category,
          stock: stockInfo.stock,
          unitPrice: stockInfo.unitPrice
        };
      }
      productSales[productName].totalQuantity += quantity;
      const price = sale.unitPrice || sale.salePrice || 0;
      productSales[productName].totalRevenue += quantity * price;
    });
    let bestsellers = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity);
    res.json(bestsellers);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des meilleures ventes:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des meilleures ventes" });
  }
});

module.exports = router;