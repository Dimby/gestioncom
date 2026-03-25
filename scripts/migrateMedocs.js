require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/medoc');

const MONGO_URI = process.env.MONGO_URI;

async function migrateMedocs() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connecté à MongoDB');

    // Lire le fichier medocs.json
    const filePath = path.join(__dirname, '../public/medocs.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const medocsData = JSON.parse(data);

    console.log(`\n📦 ${medocsData.medicines.length} produits trouvés dans le JSON`);

    // Supprimer les produits existants (optionnel - à commenter si vous voulez conserver les données)
    // await Product.deleteMany({});
    // console.log('✓ Produits existants supprimés');

    // Importer les nouveaux produits
    let successCount = 0;
    let errorCount = 0;

    for (const medicine of medocsData.medicines) {
      try {
        // Vérifier si le produit existe déjà
        const existing = await Product.findOne({ id: medicine.id });
        
        if (existing) {
          // Mettre à jour le produit existant
          await Product.updateOne({ id: medicine.id }, medicine);
          successCount++;
        } else {
          // Créer un nouveau produit
          await Product.create(medicine);
          successCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Erreur pour ${medicine.brand_name}:`, error.message);
      }
    }

    console.log(`\n✓ Migration terminée:`);
    console.log(`  - ${successCount} produits importés/mis à jour`);
    console.log(`  - ${errorCount} erreurs`);

    await mongoose.connection.close();
    console.log('\n✓ Déconnecté de MongoDB');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateMedocs();
