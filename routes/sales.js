// Fichier: routes/sales.js
const express = require("express");
const Sale = require("../models/sale");
const Stock = require("../models/stock");

const router = express.Router();

// Route GET (toutes les ventes)

// GET all sales
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find();
    res.json(sales);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout vente)

// POST create sale
router.post("/", async (req, res) => {
  try {
    const sale = req.body;
    const stockChange = -sale.quantity;
    // On cherche le produit vendu dans le stock par son nom
    const stockItem = await Stock.findOne({ name: sale.produit });
    if (stockItem) {
      sale.purchasePrice = stockItem.purchasePrice || 0;
      const stockBefore = stockItem.stock || 0;
      stockItem.stock = stockBefore + stockChange;
      stockItem.sold = (stockItem.sold || 0) + Math.abs(stockChange);
      stockItem.history = stockItem.history || [];
      stockItem.history.push({
        date: sale.date || new Date().toISOString(),
        change: stockChange,
        stockBefore: stockBefore,
        note: sale.category === "service" ? `Vente Service : ${sale.name}` : "Vente"
      });
      await stockItem.save();
    }
    const newSale = new Sale(sale);
    await newSale.save();
    res.json({ message: "Vente enregistrée !" });
  } catch (e) {
    console.error("Erreur POST /api/sales:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// === NOUVELLE ROUTE PUT POUR LA MODIFICATION ===

// PUT update sale
router.put("/:id", async (req, res) => {
  try {
    const saleId = req.params.id;
    const updatedSaleData = req.body;
    // 1. Trouver la vente originale
    const originalSale = await Sale.findOne({ id: saleId });
    if (!originalSale) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }
    // 2. Annuler l'impact de la vente originale sur le stock
    const originalStockItem = await Stock.findOne({ name: originalSale.produit });
    if (originalStockItem) {
      const stockBeforeReversal = originalStockItem.stock || 0;
      originalStockItem.stock += originalSale.quantity;
      originalStockItem.sold -= originalSale.quantity;
      originalStockItem.history = originalStockItem.history || [];
      originalStockItem.history.push({
        date: new Date().toISOString(),
        change: originalSale.quantity,
        stockBefore: stockBeforeReversal,
        note: `Annulation (Modif. vente ${saleId})`
      });
      await originalStockItem.save();
    }
    // 3. Appliquer l'impact de la nouvelle vente sur le stock
    const newStockItem = await Stock.findOne({ name: updatedSaleData.produit });
    if (newStockItem) {
      const stockBeforeUpdate = newStockItem.stock || 0;
      newStockItem.stock -= updatedSaleData.quantity;
      newStockItem.sold += updatedSaleData.quantity;
      newStockItem.history = newStockItem.history || [];
      newStockItem.history.push({
        date: updatedSaleData.date,
        change: -updatedSaleData.quantity,
        stockBefore: stockBeforeUpdate,
        note: updatedSaleData.category === "service" 
              ? `Vente Service Modifiée : ${updatedSaleData.name} (Vente ${saleId})`
              : `Vente Modifiée (Vente ${saleId})`
      });
      await newStockItem.save();
    }
    // 4. Remplacer l'ancienne vente par la nouvelle
    await Sale.findOneAndUpdate({ id: saleId }, { ...updatedSaleData, id: originalSale.id });
    res.json({ message: "Vente modifiée avec succès !" });
  } catch (e) {
    console.error("Erreur PUT /api/sales/:id :", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});


// Route DELETE (suppression vente)

// DELETE sale
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const sale = await Sale.findOne({ id: id });
    if (!sale) return res.status(404).json({ message: "Vente non trouvée" });
    // Logique d'annulation de stock
    const stockItem = await Stock.findOne({ name: sale.produit });
    if (stockItem) {
      const stockBeforeReversal = stockItem.stock || 0;
      stockItem.stock += sale.quantity;
      stockItem.sold -= sale.quantity;
      stockItem.history = stockItem.history || [];
      stockItem.history.push({
        date: new Date().toISOString(),
        change: sale.quantity,
        stockBefore: stockBeforeReversal,
        note: `Vente supprimée (ID: ${id})`
      });
      await stockItem.save();
    }
    await Sale.deleteOne({ id: id });
    res.json({ success: true, message: "Vente supprimée et stock restauré." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route GET (meilleures ventes)
router.get("/bestsellers", async (req, res) => {
  try {
    const data = await readDb();
    const stocks = data.stocks || [];
    const sorted = stocks
      .filter(p => p.sold && p.sold > 0)
      .sort((a, b) => b.sold - a.sold);
    res.json(sorted);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;