// Fichier: routes/services.js
const express = require("express");
const { readDb, updateDb } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.services || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.post("/", async (req, res) => {
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

    await updateDb((data) => {
      data.services = data.services || [];
      data.services.push(service);
    });

    res.json({ message: "Service enregistré !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updatedServiceData = req.body;

    const result = await updateDb((data) => {
      const index = data.services.findIndex(s => s.id === id);
      if (index === -1) return { notFound: true };
      data.services[index] = { ...data.services[index], ...updatedServiceData };
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Service non trouvé." });
    }

    res.json({ message: "Service modifié." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await updateDb((data) => {
      const index = data.services.findIndex(s => s.id === id);
      if (index === -1) return { notFound: true };
      data.services.splice(index, 1);
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Service non trouvé." });
    }

    res.json({ message: "Service supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
