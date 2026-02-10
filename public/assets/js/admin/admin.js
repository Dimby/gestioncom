import { getFormLabel } from '../utils.js';

// On garde cette fonction si vous utilisez encore le select2 pour la section "Service"
async function populateServiceProduitSelect() {
  const select = document.getElementById('serviceProduit');
  if (!select) return;
  try {
    const response = await fetch('/medocs.json');
    const data = await response.json();
    const produits = data.medicines || [];
    
    select.innerHTML = '<option value="">Sélectionner un produit</option>';
    
    produits.forEach(prod => {
      if (prod.id && prod.brand_name) {
        const option = document.createElement('option');
        option.value = prod.id;
        option.textContent = prod.brand_name;
        select.appendChild(option);
      }
    });
  } catch (err) {
    console.error('Erreur chargement produits pour service:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  
  // === NOUVELLE LOGIQUE : CRÉATION DE PRODUIT ET AJOUT STOCK ===
  const stockForm = document.getElementById("stockForm");

  if (stockForm) {
    stockForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // On récupère les valeurs des nouveaux champs (input text et select catégorie)
      const brandName = document.getElementById("brandName").value.trim();
      const genericName = document.getElementById("genericName").value;
      const purchasePrice = Number(document.getElementById("prix").value);
      const salePrice = Number(document.getElementById("salePrice").value);
      const stockToAdd = Number(document.getElementById("stock").value);
      
      // Génération d'un ID unique basé sur le temps (évite les doublons)
      const newId = Date.now().toString(); 
      const label = getFormLabel(genericName);
      const fullName = `${brandName} - ${label}`;

      const produit = {
        id: newId,
        brand_name: brandName, // Utile pour la synchro medocs.json côté serveur
        name: fullName,
        category: genericName,
        purchasePrice,
        salePrice,
        stock: stockToAdd,
        sold: 0,
        history: [{
          date: new Date().toISOString(),
          change: stockToAdd,
          stockBefore: stockToAdd,
          purchasePrice,
          salePrice,
          note: "Création initiale du produit"
        }]
      };

      try {
        const res = await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(produit)
        });

        if (res.ok) {
          alert(`Produit "${brandName}" créé et ajouté au stock !`);
          stockForm.reset();
          // Optionnel : rafraîchir la liste des produits pour la section Service
          populateServiceProduitSelect();
        } else {
          const err = await res.json();
          alert(err.message || "Erreur lors de l'ajout.");
        }
      } catch (err) {
        alert("Erreur réseau.");
      }
    });
  }

  // === LOGIQUE FORMULAIRE SERVICE ===
  populateServiceProduitSelect();

  const serviceForm = document.getElementById('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('serviceName').value.trim();
      const price = document.getElementById('servicePrice').value.trim();
      const info = document.getElementById('serviceInfo').value.trim();
      const serviceProduitId = document.getElementById('serviceProduit').value;

      const service = { name, price, produitId: serviceProduitId, info };

      try {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(service)
        });
        if (res.ok) {
          alert('Service enregistré !');
          serviceForm.reset();
        }
      } catch (err) {
        alert("Erreur réseau.");
      }
    });
  }
});