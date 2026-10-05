// Fichier: routes/sales.js
const express = require("express");
const { readDb, updateDb } = require("../db");

const router = express.Router();

function findStockItem(stocks, sale) {
  if (sale && sale.stockId != null && sale.stockId !== "") {
    const byId = stocks.find(s => String(s.id) === String(sale.stockId));
    if (byId) return byId;
  }
  if (sale && sale.produit) {
    return stocks.find(s => s.name === sale.produit);
  }
  return undefined;
}

function resolveStockId(sale, stockItem) {
  if (sale.stockId != null && sale.stockId !== "") return sale.stockId;
  if (stockItem && stockItem.id != null) return stockItem.id;
  return sale.stockId;
}

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

    await updateDb((data) => {
      const stockItem = findStockItem(data.stocks, sale);

      if (stockItem) {
        sale.stockId = resolveStockId(sale, stockItem);
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
      }

      data.sales.push(sale);
    });

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

    const result = await updateDb((data) => {
      const originalSaleIndex = data.sales.findIndex(s => s.id == saleId);
      if (originalSaleIndex === -1) {
        return { notFound: true };
      }
      const originalSale = data.sales[originalSaleIndex];

      const originalStockItem = findStockItem(data.stocks, originalSale);
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
      }

      const newStockItem = findStockItem(data.stocks, updatedSaleData);
      if (newStockItem) {
        updatedSaleData.stockId = resolveStockId(updatedSaleData, newStockItem);
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
      }

      data.sales[originalSaleIndex] = { ...updatedSaleData, id: originalSale.id };
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

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

    const result = await updateDb((data) => {
      const index = data.sales.findIndex(sale => sale.id == id);
      if (index === -1) return { notFound: true };

      const originalSale = data.sales[index];
      const stockItem = findStockItem(data.stocks, originalSale);

      if (stockItem) {
        const stockBeforeReversal = stockItem.stock || 0;
        stockItem.stock += originalSale.quantity;
        stockItem.sold -= originalSale.quantity;
        stockItem.history = stockItem.history || [];
        stockItem.history.push({
          date: new Date().toISOString(),
          change: originalSale.quantity,
          stockBefore: stockBeforeReversal,
          note: `Vente supprimée (ID: ${id})`
        });
      }

      data.sales.splice(index, 1);
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

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
