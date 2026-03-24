const express = require("express");

const Medoc = require("../models/medoc");

const router = express.Router();




// GET ALL PRODUCTS from MongoDB
router.get("/", async (req, res) => {
  try {
    const products = await Medoc.find();
    res.json(products);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});


// POST ADD PRODUCT to MongoDB
router.post("/", async (req, res) => {
  try {
    const product = req.body;
    if (!product.brand_name) {
      return res.status(400).json({ message: "Nom produit requis." });
    }
    const newProduct = new Medoc({
      ...product,
      id: Date.now().toString(),
    });
    await newProduct.save();
    res.json(newProduct);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});


// PUT UPDATE PRODUCT in MongoDB
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
    const product = await Medoc.findOneAndUpdate({ id: id }, updatedData, { new: true });
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }
    res.json({ message: "Produit modifié." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});


// DELETE PRODUCT in MongoDB
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Medoc.findOneAndDelete({ id: id });
    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }
    res.json({ message: "Produit supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;