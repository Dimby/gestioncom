const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Adapt fields as needed
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  pieces: { type: String },
  purchaseTotalPrice: { type: Number },
  purchasePrice: { type: Number },
  salePrice: { type: Number },
  stock: { type: Number },
  sold: { type: Number },
  history: { type: Array, default: [] }
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;