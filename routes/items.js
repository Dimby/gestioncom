// Fichier: routes/items.js
const express = require("express");
const { readDb, updateDb } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.items || []);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const newItem = req.body;
    await updateDb((data) => {
      data.items = data.items || [];
      data.items.push(newItem);
    });
    res.json({ message: "Ajouté avec succès" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
