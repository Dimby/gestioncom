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
      document.getElementById('totalPurchase').textContent = '0';
      document.getElementById('totalSale').textContent = '0';
      return;
    }
    
    const dateData = dateMap.get(dateKey);
    document.getElementById('orderDateTitle').textContent = `Commandes [${dateData.display}]`;
    
    let totalPurchase = 0;
    let totalSale = 0;
    let totalDiff = 0;
    
    // Mettre à jour l'en-tête du tableau pour inclure une colonne #
    const tableHeader = document.querySelector('#ordersTable thead tr');
    if (tableHeader && !tableHeader.querySelector('th:first-child')?.textContent.includes('#')) {
      // Ajouter l'en-tête seulement s'il n'existe pas déjà
      const numHeader = document.createElement('th');
      numHeader.textContent = '#';
      numHeader.style.width = '40px'; // Largeur fixe pour la colonne de numérotation
      tableHeader.insertBefore(numHeader, tableHeader.firstChild);
    }

    // Tri alphabétique des entrées par nom de produit
    dateData.entries.sort((a, b) => a.productName.localeCompare(b.productName));

    // Ajouter chaque entrée au tableau avec numérotation
    dateData.entries.forEach((entry, index) => {
      const purchaseTotal = entry.purchasePrice * entry.stockChange;
      const saleTotal = entry.salePrice * entry.stockChange;
      const diffSalePurch = saleTotal - purchaseTotal;
      
      totalPurchase += purchaseTotal;
      totalSale += saleTotal;
      totalDiff += diffSalePurch;
      
      const row = document.createElement('tr');
      
      // Ajouter une classe spéciale pour les modifications rétroactives
      if (entry.isRetroactive) {
        row.classList.add('retroactive-entry');
      }
      
      // Ajout de la numérotation et de la note
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.productName}</td>
        <td>${entry.category}</td>
        <td>${entry.purchasePrice} Ar</td>
        <td>${entry.salePrice} Ar</td>
        <td>${entry.stockChange}</td>
        <td>${purchaseTotal.toLocaleString()} Ar</td>
        <td>${saleTotal.toLocaleString()} Ar</td>
        <td>${diffSalePurch.toLocaleString()} Ar</td>
        <td>
          ${entry.isRetroactive ? '<span title="Modification rétroactive" class="retroactive-indicator">⟲</span>' : ''}
          <span class="note">${entry.entryNote}</span>
          <button class="edit-btn" data-id="${entry.productId}">✏️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // Mettre à jour les totaux
    document.getElementById('totalPurchase').textContent = `${totalPurchase.toLocaleString()} Ar`;
    document.getElementById('totalSale').textContent = `${totalSale.toLocaleString()} Ar`;
    document.getElementById('totalDiff').textContent = `${totalDiff.toLocaleString()} Ar`;
    
    // Ajouter les gestionnaires d'événements pour les boutons d'édition et de suppression
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const productId = this.getAttribute('data-id');
        // Rediriger vers la page d'édition ou ouvrir un modal
        alert(`Éditer le produit ${productId}`);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const productId = this.getAttribute('data-id');
        const entryDate = this.getAttribute('data-date');
        
        if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
          // Appel API pour supprimer l'entrée
          try {
            const response = await fetch(`/api/stocks/${productId}/history`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ date: entryDate })
            });
            
            if (response.ok) {
              // Recharger le tableau
              updateOrdersTable(dateKey);
            } else {
              alert("Erreur lors de la suppression");
            }
          } catch (error) {
            console.error("Erreur:", error);
            alert("Une erreur est survenue");
          }
        }
      });
    });
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