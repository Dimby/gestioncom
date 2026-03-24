const mongoose = require('mongoose');

const historyImportSchema = new mongoose.Schema({
  // Ajoute les champs nécessaires pour l'historique d'import
  date: { type: Date, default: Date.now },
  filename: { type: String },
  // Ajoute d'autres champs selon besoin
});

const HistoryImport = mongoose.model('HistoryImport', historyImportSchema);
module.exports = HistoryImport;
