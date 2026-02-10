document.addEventListener('DOMContentLoaded', async function() {
  // Récupérer tous les produits avec leur historique
  const response = await fetch('/api/stocks');
  const products = await response.json();

  // Extraire toutes les dates des historiques et les regrouper
  const dateMap = new Map();
  
  products.forEach(product => {
    if (product.history && Array.isArray(product.history)) {
      product.history.forEach(entry => {
        // Modification ici: capturer tous types de modifications de stock positives
        if ((entry.change > 0 && (entry.note === "Création produit" || 
            entry.note.startsWith("Modification stock") || 
            entry.note.startsWith("Modification rétroactive"))) ||
            entry.note === "Commande") {
          
          // Formater la date pour l'affichage et le regroupement
          const date = new Date(entry.date);
          const month = date.toLocaleString('fr-FR', { month: 'long' });
          const day = date.getDate();
          const year = date.getFullYear();
          
          const formattedDate = `${month.charAt(0).toUpperCase() + month.slice(1)} - ${day} ${year}`;
          const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, {
              display: formattedDate,
              entries: []
            });
          }
          
          // Détermination des prix à afficher pour cette entrée
          let purchasePrice = product.purchasePrice;
          let salePrice = product.salePrice;
          if (entry.priceChange) {
            purchasePrice = entry.priceChange.newPurchasePrice;
            salePrice = product.salePrice;
          }
          if (entry.salePriceChange) {
            salePrice = entry.salePriceChange.newSalePrice;
            purchasePrice = product.purchasePrice;
          }
          if (typeof entry.purchasePrice !== "undefined") {
            purchasePrice = entry.purchasePrice;
          }
          if (typeof entry.salePrice !== "undefined") {
            salePrice = entry.salePrice;
          }

          // Ajouter cette entrée d'historique avec les infos du produit et les prix corrects
          dateMap.get(dateKey).entries.push({
            productId: product.id,
            productName: product.name,
            category: product.category,
            purchasePrice: purchasePrice,
            salePrice: salePrice,
            stockChange: entry.change,
            date: entry.date,
            entryNote: entry.note,
            isRetroactive: entry.note.includes("rétroactive")
          });
        }
      });
    }
  });
  
  // Convertir la Map en tableau et trier par date (la plus récente en premier)
  const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => new Date(b[0]) - new Date(a[0]));
  
  // Remplir le sélecteur de dates
  const dateSelector = document.getElementById('dateSelector');
  sortedDates.forEach(([dateKey, dateData]) => {
    const option = document.createElement('option');
    option.value = dateKey;
    option.textContent = dateData.display;
    dateSelector.appendChild(option);
  });
  
  // Ajoutons des structures pour gérer la navigation par mois
  let currentMonthIndex = 0;
  let availableMonths = [];
  
  // Fonction pour extraire tous les mois uniques des dates disponibles
  function extractAvailableMonths(sortedDates) {
    const months = [];
    const uniqueMonthKeys = new Set();
    
    sortedDates.forEach(([dateKey]) => {
      const date = new Date(dateKey);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!uniqueMonthKeys.has(monthKey)) {
        uniqueMonthKeys.add(monthKey);
        months.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          display: date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
          key: monthKey
        });
      }
    });
    
    // Tri par date décroissante (mois le plus récent en premier)
    return months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }
  
  // Fonction pour mettre à jour l'affichage du mois actuel
  function updateCurrentMonthDisplay() {
    if (availableMonths.length === 0) {
      document.getElementById('currentMonthDisplay').textContent = 'Aucun mois';
      return;
    }
    
    const currentMonth = availableMonths[currentMonthIndex];
    document.getElementById('currentMonthDisplay').textContent = 
      currentMonth.display.charAt(0).toUpperCase() + currentMonth.display.slice(1);
    
    // Filtrer les options du sélecteur de dates pour n'afficher que les dates du mois sélectionné
    filterDatesByMonth(currentMonth);
  }
  
  // Fonction pour filtrer les dates du sélecteur par mois
  function filterDatesByMonth(monthData) {
    // Masquer toutes les options
    Array.from(dateSelector.options).forEach(option => {
      if (option.value) {
        const date = new Date(option.value);
        const optionMonthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        // Afficher uniquement les options correspondant au mois actuel
        option.style.display = (optionMonthKey === monthData.key) ? '' : 'none';
      }
    });
    
    // Sélectionner la première date disponible pour ce mois
    const firstVisibleOption = Array.from(dateSelector.options).find(option => 
      option.value && option.style.display !== 'none'
    );
    
    if (firstVisibleOption) {
      dateSelector.value = firstVisibleOption.value;
      updateOrdersTable(firstVisibleOption.value);
    } else {
      dateSelector.value = "";
      updateOrdersTable("");
    }
  }
  
  // Après avoir rempli le sélecteur de dates et avant de sélectionner la date par défaut
  availableMonths = extractAvailableMonths(sortedDates);
  
  // Ajouter les gestionnaires d'événements pour les boutons de navigation par mois
  document.getElementById('prevMonth').addEventListener('click', function() {
    if (currentMonthIndex < availableMonths.length - 1) {
      currentMonthIndex++;
      updateCurrentMonthDisplay();
    }
  });
  
  document.getElementById('nextMonth').addEventListener('click', function() {
    if (currentMonthIndex > 0) {
      currentMonthIndex--;
      updateCurrentMonthDisplay();
    }
  });
  
  // Initialiser l'affichage du mois actuel
  updateCurrentMonthDisplay();
  
  // Fonction pour mettre à jour le tableau en fonction de la date sélectionnée
  function updateOrdersTable(dateKey) {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';
    
    if (!dateKey || !dateMap.has(dateKey)) {
      document.getElementById('orderDateTitle').textContent = 'Commandes';
      return;
    }
    
    const dateData = dateMap.get(dateKey);
    document.getElementById('orderDateTitle').textContent = `Commandes [${dateData.display}]`;
    
    let totalPurchase = 0, totalSale = 0, totalDiff = 0;

    dateData.entries.sort((a, b) => a.productName.localeCompare(b.productName));

    dateData.entries.forEach((entry, index) => {
      const purchaseTotal = entry.purchasePrice * entry.stockChange;
      const saleTotal = entry.salePrice * entry.stockChange;
      const diff = saleTotal - purchaseTotal;
      
      totalPurchase += purchaseTotal;
      totalSale += saleTotal;
      totalDiff += diff;
      
      const row = document.createElement('tr');
      if (entry.isRetroactive) row.classList.add('retroactive-entry');
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.productName}</td>
        <td>${entry.category}</td>
        <td>${entry.purchasePrice.toLocaleString()} Ar</td>
        <td>${entry.salePrice.toLocaleString()} Ar</td>
        <td>${entry.stockChange}</td>
        <td>${purchaseTotal.toLocaleString()} Ar</td>
        <td>${saleTotal.toLocaleString()} Ar</td>
        <td>${diff.toLocaleString()} Ar</td>
        <td style="text-align:center;">
          <span class="action-edit" title="Modifier" style="cursor:pointer;" 
                data-id="${entry.productId}" data-date="${entry.date}">✏️</span>
          <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;" 
                data-id="${entry.productId}" data-date="${entry.date}">🗑️</span>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    document.getElementById('totalPurchase').textContent = `${totalPurchase.toLocaleString()} Ar`;
    document.getElementById('totalSale').textContent = `${totalSale.toLocaleString()} Ar`;
    document.getElementById('totalDiff').textContent = `${totalDiff.toLocaleString()} Ar`;

    initActionButtons(dateKey);
  }

  // Initialisation du Modal (Copie adaptée de listStocks.js)
function createEditModal() {
  if (document.getElementById("editModal")) return;
  const modal = document.createElement("div");
  modal.id = "editModal";
  modal.style = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:1000;";
  modal.innerHTML = `
    <div style="background:#fff; padding:20px; border-radius:8px; width:350px;">
      <h3>Modifier la commande</h3>
      <form id="editOrderForm">
        <label>Quantité ajoutée</label>
        <input type="number" id="editQty" required style="width:100%; margin-bottom:10px;">
        <label>Prix d'achat unitaire</label>
        <input type="number" id="editPurch" required style="width:100%; margin-bottom:10px;">
        <label>Prix de vente unitaire</label>
        <input type="number" id="editSale" required style="width:100%; margin-bottom:20px;">
        <div style="display:flex; gap:10px;">
          <button type="submit" style="flex:1; background:#2ecc71; color:white; border:none; padding:10px; border-radius:4px;">Enregistrer</button>
          <button type="button" id="closeModal" style="flex:1; background:#e74c3c; color:white; border:none; padding:10px; border-radius:4px;">Annuler</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function initActionButtons(dateKey) {
  createEditModal();

  // LOGIQUE DE SUPPRESSION
  document.querySelectorAll(".action-delete").forEach(btn => {
    btn.onclick = async function() {
      const id = this.getAttribute("data-id");
      const date = this.getAttribute("data-date");
      if (confirm("Supprimer cette entrée ? Cela impactera le stock actuel.")) {
        const res = await fetch(`/api/stocks/${id}/history/entry`, { 
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: date })
        });
        if (res.ok) window.location.reload();
      }
    };
  });

  // LOGIQUE DE MODIFICATION
  document.querySelectorAll(".action-edit").forEach(btn => {
    btn.onclick = function() {
      const id = this.getAttribute("data-id");
      const date = this.getAttribute("data-date");
      const entry = dateMap.get(dateKey).entries.find(e => e.productId === id && e.date === date);

      document.getElementById("editQty").value = entry.stockChange;
      document.getElementById("editPurch").value = entry.purchasePrice;
      document.getElementById("editSale").value = entry.salePrice;
      document.getElementById("editModal").style.display = "flex";

      document.getElementById("editOrderForm").onsubmit = async (e) => {
        e.preventDefault();
        const updatedEntry = {
          date: date,
          newQty: Number(document.getElementById("editQty").value),
          newPurch: Number(document.getElementById("editPurch").value),
          newSale: Number(document.getElementById("editSale").value)
        };

        const res = await fetch(`/api/stocks/${id}/history/entry`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedEntry)
        });

        if (res.ok) window.location.reload();
      };
    };
  });

  document.getElementById("closeModal").onclick = () => {
    document.getElementById("editModal").style.display = "none";
  };
}
  
  // Sélectionner la date la plus récente par défaut (si disponible)
  if (sortedDates.length > 0) {
    const mostRecentDate = sortedDates[0][0];
    dateSelector.value = mostRecentDate;
    updateOrdersTable(mostRecentDate);
  }
  
  // Écouter les changements de sélection de date
  dateSelector.addEventListener('change', function() {
    updateOrdersTable(this.value);
  });
  
  // Ajouter un style CSS pour les modifications rétroactives
  const style = document.createElement('style');
  style.textContent = `
    .retroactive-entry {
      background-color: #fff8e1; /* fond légèrement jaune */
    }
    .retroactive-indicator {
      color: #FF6B00;
      margin-right: 8px;
      font-size: 1.1em;
      cursor: help;
    }
    .note {
      font-size: 0.8em;
      color: #555;
      display: none; /* cacher les notes par défaut */
    }
    td:hover .note {
      display: inline; /* afficher au survol */
      margin-left: 5px;
    }
  `;
  document.head.appendChild(style);
  
  // Gestionnaire pour le bouton d'export Excel
  document.getElementById('exportExcel').addEventListener('click', function() {
    // Récupérer la date sélectionnée
    const dateKey = document.getElementById('dateSelector').value;
    if (!dateKey || !dateMap.has(dateKey)) {
      alert('Veuillez sélectionner une date');
      return;
    }
    
    const dateData = dateMap.get(dateKey);
    const formattedDate = dateData.display;
    
    // Créer les données pour le fichier Excel
    const excelData = [];
    
    // Ajouter le titre
    excelData.push(['Commande du ' + formattedDate]);
    excelData.push([]); // Ligne vide pour l'espacement
    
    // Ajouter les en-têtes
    excelData.push(['Numéro', 'Designation', 'Quantité', 'Prix de vente', 'Total']);
    
    // Trier alphabétiquement pour l'export Excel
    dateData.entries.sort((a, b) => a.productName.localeCompare(b.productName));
    
    // Ajouter les données
    let totalSale = 0;
    dateData.entries.forEach((entry, index) => {
      const lineTotal = entry.salePrice * entry.stockChange;
      totalSale += lineTotal;
      
      excelData.push([
        index + 1,
        entry.productName,
        entry.stockChange,
        // Format avec séparateur de milliers
        entry.salePrice.toLocaleString('fr-FR'),
        // Format avec séparateur de milliers
        lineTotal.toLocaleString('fr-FR')
      ]);
    });
    
    // Ajouter le total
    excelData.push([]); // Ligne vide
    excelData.push(['', '', '', 'TOTAL', totalSale.toLocaleString('fr-FR')]);
    
    // Créer une feuille de calcul
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Mise en forme des cellules (fusion, style, etc.)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Fusionner le titre sur 5 colonnes
    ];
    
    // Ajuster la largeur des colonnes
    ws['!cols'] = [
      { wch: 10 }, // Largeur colonne Numéro
      { wch: 30 }, // Largeur colonne Désignation
      { wch: 10 }, // Largeur colonne Quantité
      { wch: 15 }, // Largeur colonne Prix
      { wch: 15 }  // Largeur colonne Total
    ];
    
    // Alignement à droite pour la dernière ligne (total général)
    if (!ws['!types']) ws['!types'] = [];
    const lastRowIndex = excelData.length - 1;
    const totalCellRef = XLSX.utils.encode_cell({r: lastRowIndex, c: 4}); // Colonne E, dernière ligne
    if (!ws[totalCellRef]) ws[totalCellRef] = {};
    ws[totalCellRef].s = { alignment: { horizontal: "right" } };
    
    // Créer un classeur et ajouter la feuille
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commande");
    
    // Générer le fichier et le télécharger
    const fileName = `Commande_${dateKey}.xlsx`;
    XLSX.writeFile(wb, fileName);
  });
});