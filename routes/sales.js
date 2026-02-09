// Fichier: routes/sales.js
const express = require("express");
const { readDb, writeDb } = require("../db");

const router = express.Router();

// Route GET (toutes les ventes)
router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.sales || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout vente)
router.post("/", async (req, res) => {
  try {
    const sale = req.body;
    const stockChange = -sale.quantity;

    const data = await readDb();

    // On cherche le produit vendu dans le stock par son nom
    const stockItem = data.stocks.find(s => s.name === sale.produit);

    if (stockItem) {
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
    }

    data.sales.push(sale);
    
    await writeDb(data);
    
    res.json({ message: "Vente enregistrée !" });
  } catch (e) {
    console.error("Erreur POST /api/sales:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// === NOUVELLE ROUTE PUT POUR LA MODIFICATION ===
router.put("/:id", async (req, res) => {
  try {
    const saleId = req.params.id;
    const updatedSaleData = req.body;
    
    const data = await readDb();

    // 1. Trouver la vente originale
    const originalSaleIndex = data.sales.findIndex(s => s.id == saleId);
    if (originalSaleIndex === -1) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }
    const originalSale = data.sales[originalSaleIndex];

    // 2. Annuler l'impact de la vente originale sur le stock
    const originalStockItem = data.stocks.find(s => s.name === originalSale.produit);
    if (originalStockItem) {
      const stockBeforeReversal = originalStockItem.stock || 0;
      originalStockItem.stock += originalSale.quantity; // Remet le stock
      originalStockItem.sold -= originalSale.quantity;   // Annule la vente
      originalStockItem.history = originalStockItem.history || [];
      originalStockItem.history.push({
        date: new Date().toISOString(),
        change: originalSale.quantity, // Changement positif
        stockBefore: stockBeforeReversal,
        note: `Annulation (Modif. vente ${saleId})`
      });
    }

    // 3. Appliquer l'impact de la nouvelle vente sur le stock
    const newStockItem = data.stocks.find(s => s.name === updatedSaleData.produit);
    if (newStockItem) {
      const stockBeforeUpdate = newStockItem.stock || 0;
      newStockItem.stock -= updatedSaleData.quantity; // Retire le nouveau stock
      newStockItem.sold += updatedSaleData.quantity;   // Ajoute la nouvelle vente
      newStockItem.history = newStockItem.history || [];
      newStockItem.history.push({
        date: updatedSaleData.date, // Utilise la date de la vente modifiée
        change: -updatedSaleData.quantity, // Changement négatif
        stockBefore: stockBeforeUpdate,
        note: updatedSaleData.category === "service" 
              ? `Vente Service Modifiée : ${updatedSaleData.name} (Vente ${saleId})`
              : `Vente Modifiée (Vente ${saleId})`
      });
    }
    
    // 4. Remplacer l'ancienne vente par la nouvelle dans le tableau des ventes
    // On garde l'ID original mais on met à jour toutes les autres données
    data.sales[originalSaleIndex] = { ...updatedSaleData, id: originalSale.id };

    // 5. Sauvegarder la base de données
    await writeDb(data);
    
    res.json({ message: "Vente modifiée avec succès !" });

  } catch (e) {
    console.error("Erreur PUT /api/sales/:id :", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});


// Route DELETE (suppression vente)
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await readDb();
    
    const index = data.sales.findIndex(sale => sale.id == id);
    if (index === -1) return res.status(404).json({ message: "Vente non trouvée" });

    // === Logique d'annulation de stock (importante) ===
    const originalSale = data.sales[index];
    const stockItem = data.stocks.find(s => s.name === originalSale.produit);
    
    if (stockItem) {
      const stockBeforeReversal = stockItem.stock || 0;
      stockItem.stock += originalSale.quantity; // Remet le stock
      stockItem.sold -= originalSale.quantity;   // Annule la vente
      stockItem.history = stockItem.history || [];
      stockItem.history.push({
        date: new Date().toISOString(),
        change: originalSale.quantity, // Changement positif
        stockBefore: stockBeforeReversal,
        note: `Vente supprimée (ID: ${id})`
      });
    }
    // ================================================

    data.sales.splice(index, 1); // Supprimer la vente
    
    await writeDb(data);
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