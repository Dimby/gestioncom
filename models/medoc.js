const mongoose = require('mongoose');

const medocSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  brand_name: { type: String, required: true },
  generic_name: { type: String },
  pieces: { type: String },
  supplier: { type: String },
  purchasePrice: { type: Number },
  salePrice: { type: Number },
  purchaseTotalPrice: { type: Number }
});

const Medoc = mongoose.model('Medoc', medocSchema);
module.exports = Medoc;
