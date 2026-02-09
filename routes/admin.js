const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { db } = require("../db");
const { isAdmin, decode } = require("../middlewares/auth");
const { computeDbHash } = require("../utils/hash");

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Pages admin (protégées)
router.get('/', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/admin.html"));
});

router.get('/listStocks', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/listStocks.html"));
});

router.get('/listServices', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/listServices.html"));
});

router.get('/listOrders', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/listOrders.html"));
});

router.get('/historyImport', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/historyImport.html"));
});

router.get('/treasury', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/treasury.html"));
});

router.get('/import', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/import.html"));
});

router.get('/inventory', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin/inventory.html"));
});

// Route de connexion
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === decode("YWRtaW4=") && 
    password === decode("RGltYnkmJkZlbGljaWUyODI2")
  ) {
    res.cookie('auth', 'admin', { httpOnly: true });
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Identifiants invalides" });
  }
});

// Route de déconnexion
router.post('/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ success: true });
});

// Vérification de l'authentification
router.get('/check-auth', (req, res) => {
  res.json({ authenticated: req.cookies.auth === 'admin' });
});

// Envoie directement le fichier db.enc
router.get('/download-db', (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'db.enc');
    if (fs.existsSync(dbPath)) {
      res.download(dbPath, 'db.enc'); // Envoie le fichier chiffré
    } else {
      res.status(404).json({ message: "Fichier db.enc non trouvé." });
    }
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Remplace directement le fichier db.enc par le fichier uploadé
router.post('/import-db', upload.single('dbFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu." });
  }

  const tempPath = req.file.path;
  const targetPath = path.join(process.cwd(), 'db.enc');

  try {
    // Remplace l'ancien db.enc par le nouveau fichier
    // fs.renameSync déplace le fichier
    fs.renameSync(tempPath, targetPath);
    res.json({ message: "Base de données importée et remplacée avec succès." });
  } catch (err) {
    // En cas d'erreur, on supprime le fichier temporaire
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    res.status(500).json({ message: "Erreur lors du remplacement du fichier : " + err.message });
  }
});

// Route GET (historique des imports)
router.get('/history-import', async (req, res) => { // <-- MODIFIÉ (async)
  try {
    const data = await readDb(); // <-- MODIFIÉ
    res.json(data.historyImport || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;