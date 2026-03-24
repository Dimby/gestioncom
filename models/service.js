const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  produitId: { type: String },
  category: { type: String },
  // Ajoute d'autres champs selon besoin
});

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
