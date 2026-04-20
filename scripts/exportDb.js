const path = require('path');
const fs = require('fs');
const { readDb } = require('../db');

/**
 * Script d'export de la base de données chiffrée en JSON
 * Utilisation: node scripts/exportDb.js [--pretty] [--output fichier.json]
 */

async function exportDatabase() {
  try {
    // Parser les arguments
    const args = process.argv.slice(2);
    const isPretty = args.includes('--pretty');
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

    console.log('📦 Démarrage de l\'export de la base de données...\n');

    // Lire la base de données chiffrée
    const db = await readDb();

    if (!db) {
      console.error('❌ Erreur : Impossible de lire la base de données.');
      process.exit(1);
    }

    // Préparer le fichier de sortie
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFileName = `db-export-${timestamp}.json`;
    const fileName = outputFile || defaultFileName;
    const filePath = path.join(process.cwd(), fileName);

    // Écrire le fichier JSON
    const jsonContent = isPretty 
      ? JSON.stringify(db, null, 2) 
      : JSON.stringify(db);

    fs.writeFileSync(filePath, jsonContent, 'utf8');

    // Afficher les statistiques
    console.log('✅ Export réussi !\n');
    console.log('📊 Statistiques de la base :');
    console.log(`   • Articles: ${db.items?.length || 0}`);
    console.log(`   • Ventes: ${db.sales?.length || 0}`);
    console.log(`   • Stocks: ${db.stocks?.length || 0}`);
    console.log(`   • Services: ${db.services?.length || 0}`);
    console.log(`   • Mouvements: ${db.movements?.length || 0}`);
    console.log(`   • Commandes: ${db.orders?.length || 0}`);
    console.log(`   • Historique Imports: ${db.historyImport?.length || 0}`);

    console.log(`\n💾 Fichier créé : ${filePath}`);
    console.log(`📏 Taille : ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'export :', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Lancer l'export
exportDatabase();