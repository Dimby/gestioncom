const express = require("express");
const { readDb, writeDb } = require("../db");

const router = express.Router();

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

    // Validation
    if (!productId || !quantity) {
      return res.status(400).json({ message: "ID produit et quantité requis." });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "La quantité doit être supérieure à 0." });
    }

    const data = await readDb();

    // Créer la commande
    const order = {
      id: Date.now().toString(),
      productId: productId,
      quantity: Number(quantity),
      date: new Date().toISOString(),
      status: "pending" // pending, confirmed, delivered, cancelled
    };

    data.orders.push(order);
    await writeDb(data);

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
    const { items } = req.body; // items = [{productId, quantity}, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Tableau d'articles requis." });
    }

    // Récupérer les produits pour obtenir les prix
    const productsResponse = await fetch("http://localhost:3000/api/products");
    const products = await productsResponse.json();
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });

    // Validation de tous les items
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: "Chaque article doit avoir un ID et une quantité valide." });
      }
      if (!productsMap[item.productId]) {
        return res.status(404).json({ message: `Produit ${item.productId} non trouvé.` });
      }
    }

    const data = await readDb();
    const orders = [];

    // Créer les commandes avec le prix global
    for (const item of items) {
      const product = productsMap[item.productId];
      const order = {
        id: Date.now().toString() + Math.random(),
        productId: item.productId,
        quantity: Number(item.quantity),
        purchaseTotalPrice: product.purchaseTotalPrice || 0,
        date: new Date().toISOString(),
        status: "pending"
      };
      orders.push(order);
      data.orders.push(order);
    }

    await writeDb(data);

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
    const data = await readDb();

    const order = data.orders.find(o => o.id === req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    if (status) {
      order.status = status;
    }

    await writeDb(data);
    res.json({ message: "Commande mise à jour !", order: order });
  } catch (e) {
    console.error("Erreur PUT /api/orders/:id:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// DELETE ORDER
router.delete("/:id", async (req, res) => {
  try {
    const data = await readDb();
    
    const orderIndex = data.orders.findIndex(o => o.id === req.params.id);
    if (orderIndex === -1) {
      return res.status(404).json({ message: "Commande non trouvée" });
    }

    const deletedOrder = data.orders.splice(orderIndex, 1);
    await writeDb(data);

    res.json({ message: "Commande supprimée !", order: deletedOrder[0] });
  } catch (e) {
    console.error("Erreur DELETE /api/orders/:id:", e);
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
