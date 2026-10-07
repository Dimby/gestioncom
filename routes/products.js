const express = require("express");
const fs = require("fs");
const path = require("path");
const { updateDb } = require("../db");
const { PRODUCT_UNITS, normalizeProductUnits, calculatePurchasePrice } = require("../utils/productUnits");

const router = express.Router();

const filePath = path.join(__dirname, "../public/produits.js");

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
    res.json(data.produits || []);
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
    const requestedQuantity = Number(product.piecesQuantity);
    if (product.piecesQuantity !== undefined && (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0)) {
      return res.status(400).json({ message: "Le nombre de pièces doit être supérieur à zéro." });
    }
    if (product.piecesUnit !== undefined && !PRODUCT_UNITS.includes(product.piecesUnit)) {
      return res.status(400).json({ message: "Unité de produit invalide." });
    }
    const units = normalizeProductUnits(product);
    const purchaseTotalPrice = Number(product.purchaseTotalPrice) || 0;

    const newProduct = {
      id: Date.now().toString(),
      brand_name: product.brand_name,
      generic_name: product.generic_name || "",
      ...units,
      supplier: product.supplier || "",
      purchasePrice: calculatePurchasePrice(purchaseTotalPrice, units.piecesQuantity),
      salePrice: Number(product.salePrice) || 0,
      purchaseTotalPrice
    };

    data.produits = data.produits || [];
    data.produits.push(newProduct);

    writeProducts(data);

    res.json(newProduct);

  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// PUT UPDATE PRODUCT
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    const data = readProducts();

    const index = (data.produits || []).findIndex(p => p.id == id);

    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    const mergedProduct = {
      ...data.produits[index],
      ...updatedData
    };
    if (updatedData.piecesQuantity !== undefined &&
      (!Number.isFinite(Number(updatedData.piecesQuantity)) || Number(updatedData.piecesQuantity) <= 0)) {
      return res.status(400).json({ message: "Le nombre de pièces doit être supérieur à zéro." });
    }
    if (updatedData.piecesUnit !== undefined && !PRODUCT_UNITS.includes(updatedData.piecesUnit)) {
      return res.status(400).json({ message: "Unité de produit invalide." });
    }
    const units = normalizeProductUnits(mergedProduct);
    const purchaseTotalPrice = Number(mergedProduct.purchaseTotalPrice) || 0;
    data.produits[index] = {
      ...mergedProduct,
      ...units,
      purchaseTotalPrice,
      purchasePrice: calculatePurchasePrice(purchaseTotalPrice, units.piecesQuantity)
    };
    delete data.produits[index].pieces;

    writeProducts(data);

    // Le stock garde les mêmes prix et informations que le produit catalogue.
    await updateDb((db) => {
      const stock = (db.stocks || []).find(s => String(s.id) === String(id));
      if (stock) {
        const product = data.produits[index];
        stock.name = product.brand_name;
        stock.category = product.generic_name;
        stock.piecesQuantity = product.piecesQuantity;
        stock.piecesUnit = product.piecesUnit;
        delete stock.pieces;
        stock.purchaseTotalPrice = product.purchaseTotalPrice;
        stock.purchasePrice = product.purchasePrice;
        stock.salePrice = product.salePrice;
      }
    });

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

    const index = (data.produits || []).findIndex(p => p.id == id);

    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    data.produits.splice(index, 1);

    writeProducts(data);

    res.json({ message: "Produit supprimé." });

  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
