const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// chemin vers medocs.json
const filePath = path.join(__dirname, "../public/medocs.json");

// utilitaires
function readProducts() {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

function writeProducts(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET ALL PRODUCTS
router.get("/", (req, res) => {
  try {
    const data = readProducts();
    res.json(data.medicines || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// POST ADD PRODUCT
router.post("/", (req, res) => {
  try {
    const product = req.body;

    if (!product.brand_name) {
      return res.status(400).json({ message: "Nom produit requis." });
    }

    const data = readProducts();

    const newProduct = {
      id: Date.now().toString(),
      brand_name: product.brand_name,
      generic_name: product.generic_name || ""
    };

    data.medicines.push(newProduct);

    writeProducts(data);

    res.json(newProduct);

  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// PUT UPDATE PRODUCT
router.put("/:id", (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    const data = readProducts();

    const index = data.medicines.findIndex(p => p.id == id);

    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    data.medicines[index] = {
      ...data.medicines[index],
      ...updatedData
    };

    writeProducts(data);

    res.json({ message: "Produit modifié." });

  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// DELETE PRODUCT
router.delete("/:id", (req, res) => {
  try {
    const id = req.params.id;

    const data = readProducts();

    const index = data.medicines.findIndex(p => p.id == id);

    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    data.medicines.splice(index, 1);

    writeProducts(data);

    res.json({ message: "Produit supprimé." });

  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;