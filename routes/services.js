// Fichier: routes/services.js
const express = require("express");
const Service = require("../models/service");

const router = express.Router();

// Route GET (tous les services)

// GET all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route POST (ajout service)

// POST create service
router.post("/", async (req, res) => {
  try {
    const service = req.body;
    if (!service.name || !service.price || !service.produitId) {
      return res.status(400).json({ message: "Champs requis manquants: name, price, produitId." });
    }
    service.id = Date.now().toString();
    service.category = "service";
    const newService = new Service(service);
    await newService.save();
    res.json({ message: "Service enregistré !" });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route PUT (modification service)

// PUT update service
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedServiceData = req.body;
    const service = await Service.findOneAndUpdate({ id: id }, updatedServiceData, { new: true });
    if (!service) return res.status(404).json({ message: "Service non trouvé." });
    res.json({ message: "Service modifié." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Route DELETE (suppression service)

// DELETE service
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const service = await Service.findOneAndDelete({ id: id });
    if (!service) return res.status(404).json({ message: "Service non trouvé." });
    res.json({ message: "Service supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;