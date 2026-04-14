document.addEventListener('DOMContentLoaded', async function() {
  // Récupérer les commandes et les produits
  const ordersResponse = await fetch('/api/orders');
  const orders = await ordersResponse.json();
  
  const productsResponse = await fetch('/api/products');
  const products = await productsResponse.json();

  // Créer une map des produits pour accès rapide
  const productsMap = {};
  products.forEach(p => {
    productsMap[p.id] = p;
  });

  // Regrouper les commandes par date
  const dateMap = new Map();
  
  orders.forEach(order => {
    const product = productsMap[order.productId];
    if (!product) return; // Ignorer si le produit n'existe pas
    
    // Formater la date pour l'affichage et le regroupement
    const date = new Date(order.date);
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
    
    // Ajouter cette commande avec les infos du produit
    dateMap.get(dateKey).entries.push({
      orderId: order.id,
      productId: product.id,
      productName: product.brand_name || "N/A",
      supplier: product.supplier || "-",
      pieces: product.pieces || "-",
      purchaseTotalPrice: order.purchaseTotalPrice || 0,
      quantity: order.quantity,
      date: order.date,
      status: order.status
    });
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
  
  // Structures pour la navigation par mois
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
  
  // Extraire les mois disponibles et initialiser
  availableMonths = extractAvailableMonths(sortedDates);
  
  // Gestionnaires d'événements pour les boutons de navigation par mois
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
    
    let totalPrice = 0;

    // Trier les entrées par nom de produit
    dateData.entries.sort((a, b) => a.productName.localeCompare(b.productName));

    dateData.entries.forEach((entry, index) => {
      const lineTotal = entry.purchaseTotalPrice * entry.quantity;
      totalPrice += lineTotal;
      
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.productName}</td>
        <td>${entry.supplier}</td>
        <td>${entry.pieces}</td>
        <td>${entry.purchaseTotalPrice.toLocaleString()} Ar</td>
        <td>${entry.quantity}</td>
        <td>${lineTotal.toLocaleString()} Ar</td>
        <td style="text-align:center;">
          <span class="action-delete" title="Supprimer" style="cursor:pointer;" 
                data-id="${entry.orderId}">🗑️</span>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    document.getElementById('totalPrice').textContent = `${totalPrice.toLocaleString()} Ar`;

    initActionButtons(dateKey, dateData);
  }

  function initActionButtons(dateKey, dateData) {
    // LOGIQUE DE SUPPRESSION
    document.querySelectorAll(".action-delete").forEach(btn => {
      btn.onclick = async function() {
        const orderId = this.getAttribute("data-id");
        if (confirm("Supprimer cette commande ?")) {
          const res = await fetch(`/api/orders/${orderId}`, { 
            method: "DELETE"
          });
          if (res.ok) {
            alert("Commande supprimée !");
            window.location.reload();
          } else {
            alert("Erreur lors de la suppression");
          }
        }
      };
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
    excelData.push(['Numéro', 'Produit', 'Fournisseur', 'Pièces', 'Prix Global', 'Quantité', 'Total']);
    
    // Trier alphabétiquement pour l'export Excel
    dateData.entries.sort((a, b) => a.productName.localeCompare(b.productName));
    
    // Ajouter les données
    let totalPrice = 0;
    dateData.entries.forEach((entry, index) => {
      const lineTotal = entry.purchaseTotalPrice * entry.quantity;
      totalPrice += lineTotal;
      
      excelData.push([
        index + 1,
        entry.productName,
        entry.supplier,
        entry.pieces,
        entry.purchaseTotalPrice,
        entry.quantity,
        lineTotal
      ]);
    });
    
    // Ajouter le total
    excelData.push([]); // Ligne vide
    excelData.push(['', '', '', '', '', 'TOTAL', totalPrice]);
    
    // Créer une feuille de calcul
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Mise en forme des cellules (fusion, style, etc.)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } // Fusionner le titre sur 7 colonnes
    ];
    
    // Ajuster la largeur des colonnes
    ws['!cols'] = [
      { wch: 10 }, // Numéro
      { wch: 30 }, // Produit
      { wch: 20 }, // Fournisseur
      { wch: 12 }, // Pièces
      { wch: 15 }, // Prix Global
      { wch: 12 }, // Quantité
      { wch: 15 }  // Total
    ];
    
    // Créer un classeur et ajouter la feuille
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commande");
    
    // Générer le fichier et le télécharger
    const fileName = `Commande_${dateKey}.xlsx`;
    XLSX.writeFile(wb, fileName);
  });
});