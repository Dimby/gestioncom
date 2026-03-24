const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  pieces: { type: Number },
  purchaseTotalPrice: { type: Number },
  purchasePrice: { type: Number },
  salePrice: { type: Number },
  stock: { type: Number },
  sold: { type: Number },
  history: { type: Array, default: [] }
});

const Stock = mongoose.model('Stock', stockSchema);
module.exports = Stock;
