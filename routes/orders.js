const express = require("express");
const fs = require("fs");
const path = require("path");
const { readDb, updateDb } = require("../db");
const { PRODUCT_UNITS, normalizeProductUnits, calculatePurchasePrice } = require("../utils/productUnits");

const router = express.Router();

const productsPath = path.join(__dirname, "../public/produits.js");

function readProducts() {
  const data = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  return data.produits || [];
}

function writeProducts(data) {
  fs.writeFileSync(productsPath, JSON.stringify(data, null, 2));
}

// GET ALL ORDERS
router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.orders || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// POST ADD ORDER
router.post("/", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ message: "ID produit et quantité requis." });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "La quantité doit être supérieure à 0." });
    }

    const order = {
      id: Date.now().toString(),
      productId: productId,
      quantity: Number(quantity),
      date: new Date().toISOString(),
      status: "pending"
    };

    await updateDb((data) => {
      data.orders.push(order);
    });

    res.json({
      message: "Commande enregistrée !",
      order: order
    });
  } catch (e) {
    console.error("Erreur POST /api/orders:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// POST MULTIPLE ORDERS (pour ajouter plusieurs lignes à la fois)
router.post("/batch", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Tableau d'articles requis." });
    }

    const catalog = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
    const products = catalog.produits || [];
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });

    for (const item of items) {
      if (!item.productId || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return res.status(400).json({ message: "Chaque article doit avoir un ID et une quantité valide." });
      }
      if (!productsMap[item.productId]) {
        return res.status(404).json({ message: `Produit ${item.productId} non trouvé.` });
      }
      const piecesQuantity = Number(item.piecesQuantity);
      if (!Number.isFinite(piecesQuantity) || piecesQuantity <= 0 || !PRODUCT_UNITS.includes(item.piecesUnit)) {
        return res.status(400).json({ message: "Chaque article doit avoir un nombre de pièces et une unité valides." });
      }
      const price = Number(item.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ message: "Le prix global doit être un nombre positif ou nul." });
      }
    }

    // Les valeurs modifiées dans le brouillon sont appliquées au catalogue avant
    // d'être mémorisées dans la commande et dans le stock.
    const preparedItems = items.map(item => {
      const product = productsMap[item.productId];
      const orderPrice = Number(item.price);
      const units = normalizeProductUnits(item);
      product.purchaseTotalPrice = orderPrice;
      product.piecesQuantity = units.piecesQuantity;
      product.piecesUnit = units.piecesUnit;
      product.purchasePrice = calculatePurchasePrice(orderPrice, units.piecesQuantity);
      delete product.pieces;
      return {
        ...item,
        piecesQuantity: units.piecesQuantity,
        piecesUnit: units.piecesUnit,
        purchasePrice: product.purchasePrice
      };
    });
    writeProducts(catalog);

    const orders = [];
    const batchStamp = Date.now();

    await updateDb((data) => {
      preparedItems.forEach((item, index) => {
        const product = productsMap[item.productId];
        const orderedPrice = Number(item.price);
        const stockChange = item.piecesQuantity * Number(item.quantity);
        const order = {
          id: `${batchStamp}-${index}`,
          productId: item.productId,
          quantity: Number(item.quantity),
          purchaseTotalPrice: orderedPrice,
          piecesQuantity: item.piecesQuantity,
          piecesUnit: item.piecesUnit,
          supplier: product.supplier || "",
          productName: product.brand_name || "",
          date: new Date().toISOString(),
          status: "pending"
        };
        orders.push(order);
        data.orders.push(order);

        const stock = data.stocks.find(s => String(s.id) === String(product.id));
        if (stock) {
          const stockBefore = Number(stock.stock) || 0;
          stock.stock = stockBefore + stockChange;
          stock.purchaseTotalPrice = orderedPrice;
          stock.purchasePrice = item.purchasePrice;
          stock.salePrice = product.salePrice || 0;
          stock.piecesQuantity = item.piecesQuantity;
          stock.piecesUnit = item.piecesUnit;
          delete stock.pieces;
          stock.history = stock.history || [];
          stock.history.push({ date: order.date, change: stockChange, stockBefore, purchasePrice: stock.purchasePrice, salePrice: stock.salePrice, note: "Commande fournisseur" });
        } else {
          data.stocks.push({ id: product.id, name: product.brand_name, category: product.generic_name, piecesQuantity: item.piecesQuantity, piecesUnit: item.piecesUnit, purchaseTotalPrice: orderedPrice, purchasePrice: item.purchasePrice, salePrice: product.salePrice || 0, stock: stockChange, sold: 0, history: [{ date: order.date, change: stockChange, stockBefore: 0, purchasePrice: item.purchasePrice, salePrice: product.salePrice || 0, note: "Première commande fournisseur" }] });
        }
      });
    });

    res.json({
      message: `${items.length} commande(s) enregistrée(s) !`,
      orders: orders
    });
  } catch (e) {
    console.error("Erreur POST /api/orders/batch:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// GET ORDER BY ID
router.get("/:id", async (req, res) => {
  try {
    const data = await readDb();
    const order = data.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }
    res.json(order);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// PUT UPDATE ORDER
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const result = await updateDb((data) => {
      const order = data.orders.find(o => o.id === req.params.id);
      if (!order) return { notFound: true };
      if (status) {
        order.status = status;
      }
      return { notFound: false, order };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    res.json({ message: "Commande mise à jour !", order: result.order });
  } catch (e) {
    console.error("Erreur PUT /api/orders/:id:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// DELETE ORDER
router.delete("/:id", async (req, res) => {
  try {
    const result = await updateDb((data) => {
      const orderIndex = data.orders.findIndex(o => o.id === req.params.id);
      if (orderIndex === -1) return { notFound: true };
      const deletedOrder = data.orders.splice(orderIndex, 1);
      return { notFound: false, order: deletedOrder[0] };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    res.json({ message: "Commande supprimée !", order: result.order });
  } catch (e) {
    console.error("Erreur DELETE /api/orders/:id:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
