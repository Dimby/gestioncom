// Fichier: routes/stocks.js
const express = require("express");
const { readDb, updateDb } = require("../db");
const path = require("path");
const fs = require("fs").promises;
const { PRODUCT_UNITS, normalizeProductUnits, calculatePurchasePrice } = require("../utils/productUnits");

const router = express.Router();

// Route GET (tous les stocks)
router.get("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    res.json(data.stocks || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout stock)
router.post("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const { id, name, category, piecesQuantity, piecesUnit, pieces, purchaseTotalPrice, salePrice, stock, brand_name } = req.body;
    const units = normalizeProductUnits({ piecesQuantity, piecesUnit, pieces });
    if (piecesQuantity !== undefined && (!Number.isFinite(Number(piecesQuantity)) || Number(piecesQuantity) <= 0)) {
      return res.status(400).json({ message: "Le nombre de pièces doit être supérieur à zéro." });
    }
    if (piecesUnit !== undefined && !PRODUCT_UNITS.includes(piecesUnit)) {
      return res.status(400).json({ message: "Unité de produit invalide." });
    }
    const totalPrice = Number(purchaseTotalPrice) || 0;
    const unitPurchasePrice = calculatePurchasePrice(totalPrice, units.piecesQuantity);
    const created = await updateDb((data) => {
      const exists = data.stocks.find(p => p.id === id);
      if (exists) return { exists: true };
      data.stocks.push({ id, name, category, ...units, purchaseTotalPrice: totalPrice, purchasePrice: unitPurchasePrice, salePrice, stock, sold: 0, history: req.body.history });
      return { exists: false };
    });
    if (created && created.exists) {
      return res.status(400).json({ message: "Produit déjà existant." });
    }
    
    // 3. Mise à jour du catalogue produits
    const medocsPath = path.join(__dirname, "../public/produits.js");
    try {
      const medocsRaw = await fs.readFile(medocsPath, "utf8");
      const medocsJson = JSON.parse(medocsRaw);
      
      medocsJson.produits = medocsJson.produits || [];
      medocsJson.produits.push({
        id: id,
        brand_name: brand_name || name.split(' - ')[0], // Récupère le nom sans le label
        generic_name: category,
        ...units,
        supplier: category,
        purchasePrice: unitPurchasePrice,
        salePrice,
        purchaseTotalPrice: totalPrice,
      });
      
      await fs.writeFile(medocsPath, JSON.stringify(medocsJson, null, 2));
    } catch (err) {
      console.error("Erreur synchro produits:", err);
    }
    
    res.json({ message: "Produit ajouté au stock et référencé !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route PUT (mise à jour stock)
router.put("/:id", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = req.params.id;
    const updated = req.body;
    const result = await updateDb((data) => {
      const idx = data.stocks.findIndex(p => String(p.id) === String(id));
      if (idx === -1) return { notFound: true };
      data.stocks[idx] = { ...data.stocks[idx], ...updated };
      if (!data.stocks[idx].piecesQuantity || !data.stocks[idx].piecesUnit) {
        const units = normalizeProductUnits(data.stocks[idx]);
        data.stocks[idx].piecesQuantity = units.piecesQuantity;
        data.stocks[idx].piecesUnit = units.piecesUnit;
      }
      delete data.stocks[idx].pieces;
      return { notFound: false };
    });
    if (result && result.notFound) {
      res.status(404).json({ message: "Produit non trouvé." });
    } else {
      res.json({ message: "Produit mis à jour !" });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route DELETE (suppression stock)
router.delete("/:id", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = req.params.id;
    const result = await updateDb((data) => {
      const index = data.stocks.findIndex(p => String(p.id) === String(id));
      if (index === -1) return { notFound: true };
      data.stocks.splice(index, 1);
      return { notFound: false };
    });
    if (result && result.notFound) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }
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

    const result = await updateDb((data) => {
      const stock = data.stocks.find(s => String(s.id) === String(id));
      if (!stock) return { notFound: true };
      const stockBefore = stock.stock || 0;
      stock.stock = stockBefore + change;
      stock.history = stock.history || [];
      stock.history.push({
        date: new Date().toISOString(),
        change,
        stockBefore: stockBefore,
        note
      });
      return { notFound: false };
    });
    if (result && result.notFound) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }
    res.json({ message: "Historique mis à jour." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Supprimer une entrée spécifique de l'historique et ajuster le stock
router.delete("/:id/history/entry", async (req, res) => {
  try {
    const { date } = req.body;
    const result = await updateDb((data) => {
      const product = data.stocks.find(s => String(s.id) === String(req.params.id));
      if (!product || !product.history) return { notFound: true };
      const entryIndex = product.history.findIndex(h => h.date === date);
      if (entryIndex === -1) return { notFound: true };
      const entry = product.history[entryIndex];
      product.stock -= entry.change;
      product.history.splice(entryIndex, 1);
      return { notFound: false };
    });
    if (result && result.notFound) {
      res.status(404).json({ message: "Entrée non trouvée" });
    } else {
      res.json({ message: "Entrée supprimée" });
    }
  } catch (e) { res.status(500).send(e.message); }
});

// Modifier une entrée spécifique
router.put("/:id/history/entry", async (req, res) => {
  try {
    const { date, newQty, newPurch, newSale } = req.body;
    const result = await updateDb((data) => {
      const product = data.stocks.find(s => String(s.id) === String(req.params.id));
      if (!product || !product.history) return { notFound: true };
      const entry = product.history.find(h => h.date === date);
      if (!entry) return { notFound: true };
      const diff = newQty - entry.change;
      product.stock += diff;
      entry.change = newQty;
      entry.purchasePrice = newPurch;
      entry.salePrice = newSale;
      return { notFound: false };
    });
    if (result && result.notFound) {
      res.status(404).json({ message: "Entrée non trouvée" });
    } else {
      res.json({ message: "Entrée mise à jour" });
    }
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;
