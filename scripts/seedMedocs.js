// Script de seed pour medocs.json vers MongoDB
const mongoose = require("./models");
const Medoc = require("./models/medoc");
const fs = require("fs");

async function seedMedocs() {
  const raw = fs.readFileSync("./public/medocs.json", "utf8");
  const json = JSON.parse(raw);
  const medicines = json.medicines || [];
  let inserted = 0;
  for (const med of medicines) {
    // Vérifie si déjà présent
    const exists = await Medoc.findOne({ id: med.id });
    if (!exists) {
      await Medoc.create(med);
      inserted++;
    }
  }
  console.log(`Seed terminé : ${inserted} nouveaux médicaments ajoutés.`);
  mongoose.connection.close();
}

seedMedocs();
