// Fichier: routes/movements.js
const express = require("express");
const Movement = require("../models/movement");

const router = express.Router();

// Endpoint pour ajouter des mouvements

// POST create movements (bulk)
router.post("/", async (req, res) => {
  try {
    let movements = req.body;
    if (!Array.isArray(movements) || movements.length === 0) {
      return res.status(400).json({ success: false, message: "Données invalides." });
    }
    for (const movement of movements) {
      if (!movement.type || !movement.description || isNaN(movement.price)) {
        return res.status(400).json({ success: false, message: "Champs obligatoires manquants." });
      }
      movement.id = Date.now() + Math.random().toString(36).substr(2, 9);
    }
    await Movement.insertMany(movements);
    res.status(201).json({ success: true, message: "Mouvements ajoutés.", data: movements });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Endpoint pour récupérer tous les mouvements

// GET all movements
router.get("/", async (req, res) => {
  try {
    const movements = await Movement.find();
    res.json(movements);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// --- ROUTE PUT (MODIFIER) ---

// PUT update movement
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedMovement = req.body;
    const movement = await Movement.findOneAndUpdate({ id: id }, { ...updatedMovement, id: id }, { new: true });
    if (movement) {
      res.json({ success: true, message: "Mouvement modifié avec succès !" });
    } else {
      res.status(404).json({ message: "Mouvement non trouvé." });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// --- ROUTE DELETE (SUPPRIMER) ---

// DELETE movement
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const movement = await Movement.findOneAndDelete({ id: id });
    if (!movement) return res.status(404).json({ message: "Mouvement non trouvé" });
    res.json({ success: true, message: "Mouvement supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;