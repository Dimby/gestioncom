const crypto = require("crypto");

// Fonction pour calculer le hash de la base de données
function computeDbHash(data) {
  // On clone l'objet sans la signature
  const clone = JSON.parse(JSON.stringify(data));
  delete clone.signature;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

module.exports = { computeDbHash };