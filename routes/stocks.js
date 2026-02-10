// Fichier: routes/stocks.js
const express = require("express");
const { readDb, writeDb } = require("../db"); // <-- MODIFIÉ
const path = require("path");
const fs = require("fs").promises;

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
    const { id, name, category, purchasePrice, salePrice, stock, brand_name } = req.body; // brand_name passé pour medocs.json
    const data = await readDb();
    
    // 1. Vérification dans la base de données principale
    const exists = data.stocks.find(p => p.id === id);
    if (exists) {
      return res.status(400).json({ message: "Produit déjà existant." });
    }
    
    // 2. Ajout dans db.js
    data.stocks.push({ id, name, category, purchasePrice, salePrice, stock, sold: 0, history: req.body.history });
    await writeDb(data);
    
    // 3. Mise à jour de medocs.json
    const medocsPath = path.join(__dirname, "../public/medocs.json");
    try {
      const medocsRaw = await fs.readFile(medocsPath, "utf8");
      const medocsJson = JSON.parse(medocsRaw);
      
      medocsJson.medicines.push({
        id: id,
        brand_name: brand_name || name.split(' - ')[0], // Récupère le nom sans le label
        generic_name: category
      });
      
      await fs.writeFile(medocsPath, JSON.stringify(medocsJson, null, 2));
    } catch (err) {
      console.error("Erreur synchro medocs.json:", err);
      // On ne bloque pas la réponse si seul medocs.json échoue, mais on log l'erreur
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
    const data = await readDb(); // <-- MODIFIÉ
    
    const idx = data.stocks.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      data.stocks[idx] = updated; // <-- MODIFIÉ
      await writeDb(data); // <-- MODIFIÉ
      res.json({ message: "Produit mis à jour !" });
    } else {
      res.status(404).json({ message: "Produit non trouvé." });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route DELETE (suppression stock)
router.delete("/:id", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = req.params.id;
    const data = await readDb(); // <-- MODIFIÉ
    
    const index = data.stocks.findIndex(p => String(p.id) === String(id));
    if (index === -1) return res.status(404).json({ message: "Produit non trouvé." });
    
    data.stocks.splice(index, 1); // <-- MODIFIÉ
    await writeDb(data); // <-- MODIFIÉ
    
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