// Fichier: server.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// Import des modules
// On charge db.js pour lancer la migration au démarrage
require("./db"); 
const itemsRoutes = require("./routes/items");
const salesRoutes = require("./routes/sales");
const stocksRoutes = require("./routes/stocks");
const servicesRoutes = require("./routes/services");
const adminRoutes = require("./routes/admin");
const bestsellersRoutes = require("./routes/bestsellers");
const movementsRoutes = require("./routes/movements");

// Initialisation d'Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
// const upload = multer({ dest: 'uploads/' }); // Pas besoin ici, géré dans admin.js

// Routes principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/history", (req, res) => {
  res.sendFile(path.join(__dirname, "public/history.html"));
});

app.get("/bestsellers", (req, res) => {
  res.sendFile(path.join(__dirname, "public/bestsellers.html"));
});

app.get("/import", (req, res) => {
  res.sendFile(path.join(__dirname, "public/import.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// Routes API
app.use("/api/items", itemsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api", adminRoutes);  // Routes d'authentification et admin
app.use("/admin", adminRoutes); // Pages admin
app.use("/api/bestsellers", bestsellersRoutes);
app.use("/api/movements", movementsRoutes);

// SUPPRESSION des routes /download-db et /import-db 
// qui étaient en conflit avec admin.js et notre nouvelle logique.
// La logique d'import/export de data (JSON) est dans admin.js
// La logique de chiffrement (ENC) est dans db.js

// Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));