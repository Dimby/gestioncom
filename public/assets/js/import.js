
document.getElementById('importForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const fileInput = document.getElementById('dbFile');
  if (!fileInput.files.length) {
    return alert('Sélectionnez un fichier .enc à importer.');
  }

  const formData = new FormData();
  // Doit correspondre à upload.single('dbFile') dans admin.js
  formData.append('dbFile', fileInput.files[0]); 

  try {
    // Doit correspondre à la route POST dans admin.js
    const res = await fetch('/api/import-db', { 
      method: 'POST',
      body: formData
    });
    
    const result = await res.json(); // Toujours essayer de lire la réponse
    
    if (res.ok) {
      alert(result.message || 'Base de données importée avec succès !');
      // Recharger la page pour que la nouvelle DB soit prise en compte
      location.reload(); 
    } else {
      alert('Erreur: ' + (result.message || 'Une erreur est survenue lors de l\'importation.'));
    }
  } catch (err) {
    console.error('Erreur réseau:', err);
    alert('Erreur réseau lors de l importation.');
  }
});