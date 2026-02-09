// Fichier: routes/movements.js
const express = require("express");
const { readDb, writeDb } = require("../db");

const router = express.Router();

// Endpoint pour ajouter des mouvements
router.post("/", async (req, res) => {
  try {
    let movements = req.body;
    
    if (!Array.isArray(movements) || movements.length === 0) {
      return res.status(400).json({ success: false, message: "Données invalides." });
    }

    // Validation et Ajout d'ID
    for (const movement of movements) {
      if (!movement.type || !movement.description || isNaN(movement.price)) {
        return res.status(400).json({ success: false, message: "Champs obligatoires manquants." });
      }
      // GÉNÉRATION D'ID UNIQUE ICI
      movement.id = Date.now() + Math.random().toString(36).substr(2, 9);
    }
    
    const data = await readDb();
    data.movements = data.movements || [];
    data.movements.push(...movements);
    
    await writeDb(data);
    
    res.status(201).json({ success: true, message: "Mouvements ajoutés.", data: movements });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Endpoint pour récupérer tous les mouvements
router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.movements || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// --- ROUTE PUT (MODIFIER) ---
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedMovement = req.body;
    const data = await readDb();
    
    if (!data.movements) return res.status(404).json({ message: "Aucun mouvement trouvé." });

    const index = data.movements.findIndex(m => String(m.id) === String(id));
    
    if (index !== -1) {
      // On garde l'ID original et on met à jour le reste
      data.movements[index] = { ...updatedMovement, id: id };
      await writeDb(data);
      res.json({ success: true, message: "Mouvement modifié avec succès !" });
    } else {
      res.status(404).json({ message: "Mouvement non trouvé." });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// --- ROUTE DELETE (SUPPRIMER) ---
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await readDb();
    
    const index = data.movements.findIndex(m => String(m.id) === String(id));
    if (index === -1) return res.status(404).json({ message: "Mouvement non trouvé" });

    data.movements.splice(index, 1);
    await writeDb(data);
    
    res.json({ success: true, message: "Mouvement supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;