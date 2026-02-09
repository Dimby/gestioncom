// Fichier: routes/services.js
const express = require("express");
const { readDb, writeDb } = require("../db"); // <-- MODIFIÉ

const router = express.Router();

// Route GET (tous les services)
router.get("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    res.json(data.services || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout service)
router.post("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const service = req.body;
    if (
      !service.name ||
      typeof service.produitId === 'undefined'
    ) {
      return res.status(400).json({ message: "Champs requis manquants ou invalides." });
    }
    
    service.id = Date.now();
    service.category = "service";
    
    const data = await readDb(); // <-- MODIFIÉ
    data.services = data.services || [];
    data.services.push(service); // <-- MODIFIÉ
    await writeDb(data); // <-- MODIFIÉ
    
    res.json({ message: "Service enregistré !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route PUT (modification service)
router.put("/:id", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = Number(req.params.id);
    const updatedServiceData = req.body;
    
    const data = await readDb(); // <-- MODIFIÉ
    const index = data.services.findIndex(s => s.id === id);
    
    if (index === -1) return res.status(404).json({ message: "Service non trouvé." });
    
    // Fusionner l'ancien objet avec les nouvelles données
    data.services[index] = { ...data.services[index], ...updatedServiceData }; // <-- MODIFIÉ
    
    await writeDb(data); // <-- MODIFIÉ
    res.json({ message: "Service modifié." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route DELETE (suppression service)
router.delete("/:id", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const id = Number(req.params.id);
    const data = await readDb(); // <-- MODIFIÉ
    
    const index = data.services.findIndex(s => s.id === id);
    if (index === -1) return res.status(404).json({ message: "Service non trouvé." });
    
    data.services.splice(index, 1); // <-- MODIFIÉ
    
    await writeDb(data); // <-- MODIFIÉ
    res.json({ message: "Service supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;