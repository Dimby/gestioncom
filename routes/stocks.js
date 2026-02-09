// Fichier: routes/stocks.js
const express = require("express");
const { readDb, writeDb } = require("../db"); // <-- MODIFIÉ

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
    const produit = req.body;
    const data = await readDb(); // <-- MODIFIÉ
    
    const exists = data.stocks.find(
      p => p.name.toLowerCase() === produit.name.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ message: "Produit déjà existant." });
    }
    
    data.stocks.push(produit); // <-- MODIFIÉ
    await writeDb(data); // <-- MODIFIÉ
    
    res.json({ message: "Produit ajouté au stock !" });
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

module.exports = router;