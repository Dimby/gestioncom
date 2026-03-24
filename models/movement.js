const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  // Ajoute d'autres champs selon besoin
});

const Movement = mongoose.model('Movement', movementSchema);
module.exports = Movement;
