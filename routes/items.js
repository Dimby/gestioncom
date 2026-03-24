// Fichier: routes/items.js
const express = require("express");
const Item = require("../models/item");

const router = express.Router();


// GET all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// POST create item
router.post("/", async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.json({ message: "Ajouté avec succès" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;