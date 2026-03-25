const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  produitId: { type: String, required: true },
  info: { type: String },
  category: { type: String, default: 'service' }
});

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
