// Fichier: db.js
const path = require('path');
const fs = require('fs');
const { EncryptedJSONFile } = require('./EncryptedJSONFile');

// Secret pour le chiffrement.
const DB_SECRET = process.env.DB_SECRET || '45678DFGHVFYT5467VGFTGH';
const DB_FILE_ENC = path.join(process.cwd(), 'db.enc');
const DB_FILE_JSON = path.join(process.cwd(), 'db.json');

const dbInstance = new EncryptedJSONFile(DB_FILE_ENC, DB_SECRET);

// File d'attente : une seule lecture/écriture à la fois (évite d'écraser une vente).
let dbQueue = Promise.resolve();

function withDbLock(fn) {
  const run = dbQueue.then(fn, fn);
  dbQueue = run.then(() => undefined, () => undefined);
  return run;
}

function emptyDb() {
  return {
    items: [], sales: [], stocks: [], services: [],
    historyImport: [], movements: [], orders: [], signature: ""
  };
}

function ensureCollections(data) {
  if (!data.items) data.items = [];
  if (!data.sales) data.sales = [];
  if (!data.stocks) data.stocks = [];
  if (!data.services) data.services = [];
  if (!data.historyImport) data.historyImport = [];
  if (!data.movements) data.movements = [];
  if (!data.orders) data.orders = [];
  if (!data.signature) data.signature = "";
  return data;
}

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

async function readDbUnlocked() {
  let data = await dbInstance.read();
  if (!data) {
     console.log("Initialisation d'une nouvelle base de données (db.enc)...");
     data = emptyDb();
     await dbInstance.write(data);
  } else {
    ensureCollections(data);
  }
  return data;
}

/**
 * Lit la base de données chiffrée.
 * Crée le fichier avec une structure vide s'il n'existe pas.
 * @returns {Promise<object>} Les données de la base.
 */
async function readDb() {
  return withDbLock(() => readDbUnlocked());
}

/**
 * Écrit l'objet de données entier dans la base de données chiffrée.
 * @param {object} data L'objet de base de données complet à écrire.
 */
async function writeDb(data) {
  return withDbLock(() => dbInstance.write(data));
}

/**
 * Lecture + mutation + écriture sous le même verrou.
 * @param {(data: object) => (any|Promise<any>)} mutator
 */
async function updateDb(mutator) {
  return withDbLock(async () => {
    const data = await readDbUnlocked();
    const result = await mutator(data);
    await dbInstance.write(data);
    return result;
  });
}

module.exports = { readDb, writeDb, updateDb, withDbLock };
