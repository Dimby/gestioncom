const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  produit: { type: String, required: true },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number },
  date: { type: Date, default: Date.now },
  category: { type: String },
  name: { type: String },
  // Ajoute d'autres champs selon besoin
});

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
