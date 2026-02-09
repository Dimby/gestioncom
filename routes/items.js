// Fichier: routes/items.js
const express = require("express");
const { readDb, writeDb } = require("../db"); // <-- MODIFIÉ

const router = express.Router();

router.get("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    res.json(data.items || []);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const newItem = req.body;
    const data = await readDb(); // <-- MODIFIÉ
    data.items = data.items || [];
    data.items.push(newItem); // <-- MODIFIÉ
    await writeDb(data); // <-- MODIFIÉ
    res.json({ message: "Ajouté avec succès" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;