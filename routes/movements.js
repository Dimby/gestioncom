// Fichier: routes/movements.js
const express = require("express");
const { readDb, updateDb } = require("../db");

const router = express.Router();

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

    await updateDb((data) => {
      data.movements = data.movements || [];
      data.movements.push(...movements);
    });

    res.status(201).json({ success: true, message: "Mouvements ajoutés.", data: movements });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.movements || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedMovement = req.body;

    const result = await updateDb((data) => {
      if (!data.movements) return { notFound: true };
      const index = data.movements.findIndex(m => String(m.id) === String(id));
      if (index === -1) return { notFound: true };
      data.movements[index] = { ...updatedMovement, id: id };
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Mouvement non trouvé." });
    }

    res.json({ success: true, message: "Mouvement modifié avec succès !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await updateDb((data) => {
      const index = data.movements.findIndex(m => String(m.id) === String(id));
      if (index === -1) return { notFound: true };
      data.movements.splice(index, 1);
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Mouvement non trouvé" });
    }

    res.json({ success: true, message: "Mouvement supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
