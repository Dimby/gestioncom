// Fichier: routes/stocks.js
const express = require("express");
const Stock = require("../models/stock");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Route GET (tous les stocks)

// GET all stocks
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json(stocks);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout stock)

// POST create stock
router.post("/", async (req, res) => {
  try {
    const { id } = req.body;
    const exists = await Stock.findOne({ id });
    if (exists) {
      return res.status(400).json({ message: "Produit déjà existant." });
    }
    const newStock = new Stock(req.body);
    await newStock.save();
    // Optionnel: synchronisation medocs.json (à adapter si besoin)
    res.json({ message: "Produit ajouté au stock et référencé !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route PUT (mise à jour stock)

// PUT update stock
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updated = req.body;
    const stock = await Stock.findOneAndUpdate({ id: id }, updated, { new: true });
    if (stock) {
      res.json({ message: "Produit mis à jour !" });
    } else {
      res.status(404).json({ message: "Produit non trouvé." });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route DELETE (suppression stock)

// DELETE stock
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const stock = await Stock.findOneAndDelete({ id: id });
    if (!stock) return res.status(404).json({ message: "Produit non trouvé." });
    res.json({ message: "Produit supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout historique stock)
router.post("/:id/history", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = req.params.id;
    const { change, note } = req.body;
    
    const data = await readDb(); // <-- MODIFIÉ
    const stock = data.stocks.find(s => String(s.id) === String(id));
    
    if (!stock) return res.status(404).json({ message: "Produit non trouvé." });
    
    const stockBefore = stock.stock || 0; // Capturer avant modif
    stock.stock = stockBefore + change;
    stock.history = stock.history || [];
    stock.history.push({
      date: new Date().toISOString(),
      change,
      stockBefore: stockBefore, // Utiliser la valeur capturée
      note
    });
    
    await writeDb(data); // <-- MODIFIÉ
    res.json({ message: "Historique mis à jour." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Supprimer une entrée spécifique de l'historique et ajuster le stock
router.delete("/:id/history/entry", async (req, res) => {
  try {
    const { date } = req.body;
    const data = await readDb();
    const product = data.stocks.find(s => String(s.id) === String(req.params.id));
    
    const entryIndex = product.history.findIndex(h => h.date === date);
    if (entryIndex !== -1) {
      const entry = product.history[entryIndex];
      product.stock -= entry.change; // On retire l'ajout de stock
      product.history.splice(entryIndex, 1);
      await writeDb(data);
      res.json({ message: "Entrée supprimée" });
    } else {
      res.status(404).json({ message: "Entrée non trouvée" });
    }
  } catch (e) { res.status(500).send(e.message); }
});

// Modifier une entrée spécifique
router.put("/:id/history/entry", async (req, res) => {
  try {
    const { date, newQty, newPurch, newSale } = req.body;
    const data = await readDb();
    const product = data.stocks.find(s => String(s.id) === String(req.params.id));
    
    const entry = product.history.find(h => h.date === date);
    if (entry) {
      const diff = newQty - entry.change;
      product.stock += diff; // Ajuste le stock global selon la différence
      entry.change = newQty;
      entry.purchasePrice = newPurch;
      entry.salePrice = newSale;
      await writeDb(data);
      res.json({ message: "Entrée mise à jour" });
    }
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;