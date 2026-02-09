import { getFormLabel } from '../utils.js';

let medocsData = [];

async function populateProduitsSelect() {
  const select = document.getElementById('produits');
  try {
    const response = await fetch('/medocs.json');
    const data = await response.json();
    medocsData = data.medicines;
    medocsData.forEach(medoc => {
      if (medoc.id && medoc.brand_name) {
        const option = document.createElement('option');
        option.value = medoc.id;
        option.textContent = `${medoc.brand_name} - ${getFormLabel(medoc.generic_name)}`;
        select.appendChild(option);
      }
    });
  } catch (err) {
    console.error('Erreur chargement medocs:', err);
  }
}

async function populateServiceProduitSelect() {
  const select = document.getElementById('serviceProduit');
  if (!select) return;
  try {
    const response = await fetch('/medocs.json');
    const data = await response.json();
    const produits = data.medicines || [];
    
    // Option vide par défaut
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

document.addEventListener('DOMContentLoaded', async () => {
  
  // === LOGIQUE FORMULAIRE D'AJOUT DE STOCK ===

  populateProduitsSelect().then(() => {
    // Initialiser Select2 après avoir rempli les options
    if (window.$ && $.fn.select2) {
      $('#produits').select2({
        placeholder: "Sélectionner un produit"
      });
    }

    const select = document.getElementById('produits');
    const prixInput = document.getElementById('prix');
    const salePriceInput = document.getElementById('salePrice');

    // Utiliser l'événement jQuery pour Select2
    $('#produits').on('change', function () {
      const selectedId = this.value;
      let medoc = medocsData.find(m => m.id === selectedId);
      if (!medoc) {
        // fallback si pas d'id : recherche par index
        const idx = Number(selectedId);
        medoc = medocsData[idx];
      }
      if (medoc && medoc.sale_price) {
        salePriceInput.value = medoc.sale_price;
        prixInput.value = Math.round(medoc.sale_price / 1.4);
      } else {
        prixInput.value = '';
        salePriceInput.value = '';
      }
    });
  });

  const stockForm = document.getElementById("stockForm");
  if (stockForm) {
    stockForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const select = document.getElementById("produits");
      const prixInput = document.getElementById("prix");
      const salePriceInput = document.getElementById("salePrice");
      const stockInput = document.getElementById("stock");

      let medoc = medocsData.find(m => m.id === select.value);
      if (!medoc) {
        const idx = Number(select.value);
        medoc = medocsData[idx];
      }
      if (!medoc) {
        alert("Veuillez sélectionner un produit valide.");
        return;
      }

      const id = medoc.id ? medoc.id : select.value;
      const name = medoc.brand_name + ' - ' + getFormLabel(medoc.generic_name);
      const category = medoc.generic_name || '';
      const purchasePrice = Number(prixInput.value);
      const salePrice = Number(salePriceInput.value);
      const stockToAdd = Number(stockInput.value);

      let stocks = [];
      try {
        const res = await fetch("/api/stocks");
        stocks = await res.json();
      } catch (e) {
        alert("Erreur lors de la récupération du stock.");
        return;
      }

      const existing = stocks.find(p => p.id == id);

      if (existing) {
        alert("Ce produit existe déjà. Veuillez le modifier dans la page Liste des stocks.");
        e.target.reset();
        return;
      } else {
        const produit = {
          id,
          name,
          category,
          purchasePrice,
          salePrice,
          stock: stockToAdd,
          sold: 0,
          history: [
            {
              date: new Date().toISOString(),
              change: stockToAdd,
              stockBefore: stockToAdd,
              purchasePrice,
              salePrice,
              note: "Création produit"
            }
          ]
        };

        const res = await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(produit)
        });

        if (res.ok) {
          alert("Nouveau produit ajouté !");
          e.target.reset();
        } else {
          alert("Erreur lors de l'ajout du produit.");
        }
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

      if (!name) {
        alert("Veuillez saisir le nom du service.");
        return;
      }

      const service = {
        name,
        price,
        produitId: serviceProduitId, // ID du produit unique
        info
      };

      try {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(service)
        });
        if (res.ok) {
          alert('Service enregistré !');
          serviceForm.reset();
        } else {
          alert("Erreur lors de l'enregistrement du service.");
        }
      } catch (err) {
        alert("Erreur réseau.");
      }
    });
  }
});