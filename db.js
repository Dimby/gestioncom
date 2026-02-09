// Fichier: db.js
const path = require('path');
const fs = require('fs');
const { EncryptedJSONFile } = require('./EncryptedJSONFile');

// Secret pour le chiffrement.
const DB_SECRET = process.env.DB_SECRET || '45678DFGHVFYT5467VGFTGH';
const DB_FILE_ENC = path.join(process.cwd(), 'db.enc');
const DB_FILE_JSON = path.join(process.cwd(), 'db.json');

const dbInstance = new EncryptedJSONFile(DB_FILE_ENC, DB_SECRET);

// Au démarrage, migrer db.json vers db.enc si db.json existe et db.enc n'existe pas
(async () => {
  if (fs.existsSync(DB_FILE_JSON) && !fs.existsSync(DB_FILE_ENC)) {
    console.log("Migration de db.json vers db.enc...");
    try {
      const data = fs.readFileSync(DB_FILE_JSON, 'utf8');
      const jsonData = JSON.parse(data);
      await dbInstance.write(jsonData);
      // Renommer l'ancien fichier pour ne pas le migrer à chaque fois
      fs.renameSync(DB_FILE_JSON, path.join(process.cwd(), 'db.json.migrated'));
      console.log("Migration terminée. db.json a été renommé en db.json.migrated.");
    } catch (e) {
      console.error("Erreur critique lors de la migration de db.json:", e);
      process.exit(1);
    }
  }
})();

/**
 * Lit la base de données chiffrée.
 * Crée le fichier avec une structure vide s'il n'existe pas.
 * @returns {Promise<object>} Les données de la base.
 */
async function readDb() {
  let data = await dbInstance.read();
  if (!data) {
     console.log("Initialisation d'une nouvelle base de données (db.enc)...");
     data = {
      items: [], sales: [], stocks: [], services: [],
      historyImport: [], movements: [], signature: ""
    };
    await dbInstance.write(data);
  }
  return data;
}

/**
 * Écrit l'objet de données entier dans la base de données chiffrée.
 * @param {object} data L'objet de base de données complet à écrire.
 */
async function writeDb(data) {
  await dbInstance.write(data);
}

// Exporter les fonctions pour qu'elles soient utilisées par les routes
module.exports = { readDb, writeDb };