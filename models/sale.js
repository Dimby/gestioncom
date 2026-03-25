const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true },
  salePrice: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  purchasePrice: { type: Number },
  payment: { type: String, enum: ['cash', 'mobile money'], required: true },
  date: { type: Date, default: Date.now }
});

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
