// Fichier: routes/mvola.js
// Mouvements Mvola (mobile money) : données tenues à part des ventes,
// stocks et mouvements de dépenses. Un seul montant par jour (le total du soir).
const express = require("express");
const { readDb, updateDb } = require("../db");

const router = express.Router();

// Normalise une date en clé "YYYY-MM-DD".
// Une valeur déjà au format "YYYY-MM-DD" est conservée telle quelle : on évite
// `new Date("YYYY-MM-DD")` qui est interprété en UTC et décalerait le jour d'un
// cran sur les machines en fuseau négatif (le montant serait rangé la veille).
function toDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const data = await readDb();
    res.json(data.mvola || []);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

// Ajoute (ou met à jour) le montant Mvola d'une journée.
// Un seul enregistrement par date : on écrase l'existant.
router.post("/", async (req, res) => {
  try {
    const dateKey = toDateKey(req.body && req.body.date);
    const amount = Number(req.body && req.body.amount);

    if (!dateKey || isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "Données invalides." });
    }

    let entry;
    await updateDb((data) => {
      data.mvola = data.mvola || [];
      const index = data.mvola.findIndex((m) => m.date === dateKey);
      if (index === -1) {
        entry = { id: Date.now() + Math.random().toString(36).substr(2, 9), date: dateKey, amount };
        data.mvola.push(entry);
      } else {
        data.mvola[index].amount = amount;
        entry = data.mvola[index];
      }
    });

    res.status(201).json({ success: true, message: "Montant Mvola enregistré.", data: entry });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await updateDb((data) => {
      if (!data.mvola) return { notFound: true };
      const index = data.mvola.findIndex((m) => String(m.id) === String(id));
      if (index === -1) return { notFound: true };
      data.mvola.splice(index, 1);
      return { notFound: false };
    });

    if (result && result.notFound) {
      return res.status(404).json({ message: "Mouvement Mvola non trouvé." });
    }

    res.json({ success: true, message: "Mouvement Mvola supprimé." });
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur: " + e.message });
  }
});

module.exports = router;
