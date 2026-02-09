import { getFormLabel } from './utils.js';

// Variables globales
let currentPage = 1;
let itemsPerPage = 10;
let serviceCurrentPage = 1;
let serviceItemsPerPage = 10;
let mouvementCurrentPage = 1;
let mouvementItemsPerPage = 10;
let cachedSales = null;
let cachedStocks = null;
let cachedServices = null; // Ajout du cache pour les services
let cachedMovements = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 secondes

// AJOUT : Variable pour la date de filtrage
let selectedDate = new Date(); // Initialise à aujourd'hui
selectedDate.setHours(0, 0, 0, 0); // Met à minuit pour la comparaison

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Chargement initial des données (ajout de services)
    const [salesRes, stocksRes, servicesRes, movementsRes] = await Promise.all([
      fetch("/api/sales"),
      fetch("/api/stocks"),
      fetch("/api/services"),
      fetch("/api/movements")
    ]);
    const sales = await salesRes.json();
    const stocks = await stocksRes.json();
    const services = await servicesRes.json();
    const movements = await movementsRes.json();

    // Stocker dans le cache
    cachedSales = sales;
    cachedStocks = stocks;
    cachedServices = services; // Mise en cache des services
    cachedMovements = movements;
    lastFetchTime = Date.now();

    // Prépare la liste des catégories uniques
    setupCategoryFilter(sales);

    // Configuration des écouteurs d'événements
    setupEventListeners(); // Les listeners pour les boutons jour/précédent sont ajoutés ici
    updateDateDisplay(); // Affiche la date initiale (aujourd'hui)

    // Initialisation des tableaux
    renderTable(); // Affiche l'onglet produit par défaut avec les données d'aujourd'hui

    // Si l'onglet service est affiché, on initialise aussi son tableau
    if (document.getElementById('tabContentService') &&
        document.getElementById('tabContentService').style.display !== 'none') {
      renderSalesServiceTable();
    }

    // Si l'onglet mouvements est affiché, initialiser son tableau
    if (document.getElementById('tabContentMouvements') &&
        document.getElementById('tabContentMouvements').style.display !== 'none') {
      renderMouvementsTable();
    }

    // Mise à jour des totaux
    loadAndUpdateTotals();

  } catch (error) {
    console.error("Erreur lors du chargement initial:", error);
  }
});

function setupCategoryFilter(sales) {
    const categories = [...new Set(sales.map(s => s.category).filter(Boolean))];
    const categoryFilter = document.getElementById("categoryFilter");
    if (categoryFilter) {
      // Vider les options existantes sauf la première
      $(categoryFilter).find('option:not(:first)').remove();
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
      });
    }
}

function setupEventListeners() {
  const todayFilterSwitch = document.getElementById('todayFilterSwitch');
  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');

  // MODIFICATION : Listener pour le switch "Aujourd'hui"
  if (todayFilterSwitch) {
    todayFilterSwitch.addEventListener('change', function() {
      if (this.checked) {
        selectedDate = new Date(); // Se remet à aujourd'hui
        selectedDate.setHours(0, 0, 0, 0);
      } else {
        // Quand on décoche, on reste sur le jour sélectionné par les flèches
        // Si on voulait TOUT afficher, on mettrait selectedDate = null; ici
      }
      updateDateDisplay();
      refreshUI(); // Rafraîchit les données pour la date sélectionnée
    });
  }

  // AJOUT : Listener pour le bouton "Jour Précédent"
  if (prevDayBtn) {
    prevDayBtn.addEventListener('click', () => {
      selectedDate.setDate(selectedDate.getDate() - 1); // Recule d'un jour
      // Décoche automatiquement le switch "Aujourd'hui" si on navigue
      if (todayFilterSwitch) todayFilterSwitch.checked = false;
      updateDateDisplay();
      refreshUI();
    });
  }

  // AJOUT : Listener pour le bouton "Jour Suivant"
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      // Ne pas aller au-delà d'aujourd'hui
      if (selectedDate < today) {
          selectedDate.setDate(selectedDate.getDate() + 1); // Avance d'un jour
          // Si on arrive à aujourd'hui, on coche le switch
          if (todayFilterSwitch) todayFilterSwitch.checked = (selectedDate.getTime() === today.getTime());
          updateDateDisplay();
          refreshUI();
      }
    });
  }

  setupTabNavigation();
  setupProductFilters();
  setupServiceFilters();
  setupMouvementFilters();
}

// AJOUT : Fonction pour mettre à jour l'affichage de la date
function updateDateDisplay() {
    const displaySpan = document.getElementById('currentDateDisplay');
    const nextBtn = document.getElementById('nextDayBtn');
    if (displaySpan) {
        // Format DD/MM
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        displaySpan.textContent = `${day}/${month}`;
    }
    // Désactive "Suivant" si on est déjà aujourd'hui
    if (nextBtn) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        nextBtn.disabled = selectedDate >= today;
    }
}

// AJOUT : Fonction pour rafraîchir l'interface (tableaux + totaux)
function refreshUI() {
    currentPage = 1;
    serviceCurrentPage = 1;
    mouvementCurrentPage = 1;

    // Rafraîchir l'onglet actuellement visible
    if (document.getElementById('tabContentProduit')?.style.display !== 'none') renderTable();
    if (document.getElementById('tabContentService')?.style.display !== 'none') renderSalesServiceTable();
    if (document.getElementById('tabContentMouvements')?.style.display !== 'none') renderMouvementsTable();

    loadAndUpdateTotals(); // Mettre à jour les totaux avec la nouvelle date
}

function setupTabNavigation() {
    const tabProduit = document.getElementById("tabProduit");
    const tabService = document.getElementById("tabService");
    const tabMouvements = document.getElementById("tabMouvements");

    if (tabProduit) {
      tabProduit.onclick = function(e) {
        e.preventDefault();
        activateTab(this, 'tabContentProduit', [tabService, tabMouvements]);
        renderTable(); // Charger les données du tableau produit
      };
    }

    if (tabService) {
      tabService.onclick = function(e) {
        e.preventDefault();
        activateTab(this, 'tabContentService', [tabProduit, tabMouvements]);
        renderSalesServiceTable(); // Charger les données du tableau service
      };
    }

    if (tabMouvements) {
      tabMouvements.onclick = function(e) {
        e.preventDefault();
        activateTab(this, 'tabContentMouvements', [tabProduit, tabService]);
        renderMouvementsTable(); // Charger les données du tableau mouvements
      };
    }
}

function activateTab(activeTabElement, activeContentId, inactiveTabElements) {
    const activeContent = document.getElementById(activeContentId);
    const inactiveContents = inactiveTabElements.map(tab => document.getElementById(tab?.id.replace('tab', 'tabContent')));

    if (activeContent) activeContent.style.display = "";
    inactiveContents.forEach(content => { if (content) content.style.display = "none"; });

    activeTabElement.classList.add("active");
    activeTabElement.style.background = "#fff";
    inactiveTabElements.forEach(tab => {
        if (tab) {
            tab.classList.remove("active");
            tab.style.background = "#f9f9f9";
        }
    });
}

function setupProductFilters() {
    ["searchInput", "categoryFilter", "stockFilter", "minPrice", "maxPrice", "paymentFilter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => { currentPage = 1; renderTable(); });
        el.addEventListener("change", () => { currentPage = 1; renderTable(); });
      }
    });

    const resetBtn = document.getElementById("resetFilters");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        ["searchInput", "categoryFilter", "stockFilter", "minPrice", "maxPrice", "paymentFilter"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        currentPage = 1;
        renderTable();
      });
    }
}

function setupServiceFilters() {
    ["searchServiceInput", "serviceStockFilter", "serviceMinPrice", "serviceMaxPrice", "servicePaymentFilter"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => { serviceCurrentPage = 1; renderSalesServiceTable(); });
        el.addEventListener("change", () => { serviceCurrentPage = 1; renderSalesServiceTable(); });
      }
    });

    const resetServiceBtn = document.getElementById("resetServiceFilters");
    if (resetServiceBtn) {
      resetServiceBtn.addEventListener("click", () => {
        ["searchServiceInput", "serviceStockFilter", "serviceMinPrice", "serviceMaxPrice", "servicePaymentFilter"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        serviceCurrentPage = 1;
        renderSalesServiceTable();
      });
    }
}

function setupMouvementFilters() {
    ["searchMouvementInput", "typeMovementFilter", "minPriceMouvement", "maxPriceMouvement"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => { mouvementCurrentPage = 1; renderMouvementsTable(); });
        el.addEventListener("change", () => { mouvementCurrentPage = 1; renderMouvementsTable(); });
      }
    });

    const resetBtn = document.getElementById("resetMouvementFilters");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        ["searchMouvementInput", "typeMovementFilter", "minPriceMouvement", "maxPriceMouvement"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        mouvementCurrentPage = 1;
        renderMouvementsTable();
      });
    }
}

// MODIFICATION : applyDateFilter utilise maintenant selectedDate
function applyDateFilter(items) {
    if (!selectedDate) return items; // Si selectedDate est null, on n'applique pas de filtre de date

    const filterTimestamp = selectedDate.getTime();
    return items.filter(item => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);
        itemDate.setHours(0, 0, 0, 0); // Comparaison au jour près
        return itemDate.getTime() === filterTimestamp;
    });
}

async function renderTable() {
    try {
      let sales = await getSalesData();
      let stocks = await getStocksData();
      // Applique le filtre de date basé sur selectedDate
      let filteredSales = applyDateFilter(sales);
      filteredSales = filteredSales.filter(sale => sale.category !== "service");

      const search = document.getElementById("searchInput")?.value.toLowerCase() || "";
      const cat = document.getElementById("categoryFilter")?.value || "";
      const stockF = document.getElementById("stockFilter")?.value || "";
      const minPrice = Number(document.getElementById("minPrice")?.value) || null;
      const maxPrice = Number(document.getElementById("maxPrice")?.value) || null;
      const payment = document.getElementById("paymentFilter")?.value || "";

      const recette = filteredSales.reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);
      const recetteProduitSpan = document.getElementById("recetteProduit");
      if (recetteProduitSpan) {
        recetteProduitSpan.textContent = `${formatAr(recette)}`;
      }

      filteredSales = filteredSales.filter(sale => {
        if (search &&
            !((sale.produit || "").toLowerCase().includes(search) ||
              (sale.category || "").toLowerCase().includes(search))) {
          return false;
        }
        if (cat && sale.category !== cat) return false;
        if (payment && sale.payment !== payment) return false;
        if (minPrice !== null && sale.salePrice < minPrice) return false;
        if (maxPrice !== null && sale.salePrice > maxPrice) return false;
        const stockObj = stocks.find(s => s.name === sale.produit);
        const stockActuel = stockObj ? stockObj.stock : "N/A";
        if (stockF === "negative" && stockActuel >= 0) return false;
        if (stockF === "less" && !(stockActuel < 5)) return false;
        if (stockF === "more" && !(stockActuel >= 5)) return false;
        return true;
      });

      // Trier par date (plus récent en premier)
      filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalItems = filteredSales.length;
      let paginatedSales = filteredSales;
      if (itemsPerPage !== "all") {
        paginatedSales = filteredSales.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );
      }
      const tbody = document.querySelector("#salesTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      paginatedSales.forEach(sale => {
        const prixUnitaire = sale.unitPrice ? formatAr(sale.unitPrice) : "";
        const dateFormatee = formatDate(sale.date);
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", sale.id);
        tr.innerHTML = `
          <td>${dateFormatee}</td>
          <td>${sale.produit || ""}</td>
          <td>${getFormLabel(sale.category) || ""}</td>
          <td>${sale.payment || ""}</td>
          <td>${sale.quantity || ""}</td>
          <td style="text-align:right;">${prixUnitaire}</td>
          <td style="text-align:right;">${formatAr(sale.salePrice)}</td>
          <td style="text-align:center;">
            <span class="action-edit" title="Modifier" style="cursor:pointer;">✏️</span>
            <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;">🗑️</span>
          </td>
        `;
        tbody.appendChild(tr);
      });
      renderPagination(totalItems, paginatedSales.length);
      attachSaleActions(); // Ré-attacher les écouteurs après le rendu
    } catch (error) {
      console.error("Erreur lors du rendu du tableau des produits:", error);
    }
}

async function renderSalesServiceTable() {
    try {
      let sales = await getSalesData();
      let stocks = await getStocksData();
      // Applique le filtre de date basé sur selectedDate
      let filteredSales = applyDateFilter(sales);
      const search = document.getElementById("searchServiceInput")?.value.toLowerCase() || '';
      const stockF = document.getElementById("serviceStockFilter")?.value || '';
      const minPrice = Number(document.getElementById("serviceMinPrice")?.value) || null;
      const maxPrice = Number(document.getElementById("serviceMaxPrice")?.value) || null;
      const payment = document.getElementById("servicePaymentFilter")?.value || '';

      const recetteServices = filteredSales
        .filter(s => s.category === "service")
        .reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);

      const recetteServiceSpan = document.getElementById("recetteService");
      if (recetteServiceSpan) {
        recetteServiceSpan.textContent = `${formatAr(recetteServices)}`;
      }

      let filtered = filteredSales.filter(s => s.category === "service");
      filtered = filtered.filter(sale => {
        if (search &&
            !((sale.name || "").toLowerCase().includes(search) ||
              (sale.produit || "").toLowerCase().includes(search))) {
          return false;
        }
        if (payment && sale.payment !== payment) return false;
        if (minPrice !== null && sale.salePrice < minPrice) return false;
        if (maxPrice !== null && sale.salePrice > maxPrice) return false;

        if (stockF) {
          const stockObj = stocks.find(st => st.name === sale.produit);
          const stockActuel = stockObj ? stockObj.stock : "N/A";
          if (stockF === "negative" && stockActuel >= 0) return false;
          if (stockF === "less" && !(stockActuel < 5)) return false;
          if (stockF === "more" && !(stockActuel >= 5)) return false;
        }
        return true;
      });

      // Trier par date (plus récent en premier)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalItems = filtered.length;
      let paginated = filtered;
      if (serviceItemsPerPage !== "all") {
        paginated = filtered.slice(
          (serviceCurrentPage - 1) * serviceItemsPerPage,
          serviceCurrentPage * serviceItemsPerPage
        );
      }
      const tbody = document.querySelector("#salesServiceTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      paginated.forEach(sale => {
        const prixUnitaire = sale.unitPrice ? formatAr(sale.unitPrice) : "";
        const dateFormatee = formatDate(sale.date);
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", sale.id);
        tr.innerHTML = `
          <td>${dateFormatee}</td>
          <td>${sale.name || ""}</td>
          <td>${sale.category || ""}</td>
          <td>${sale.produit || ""}</td>
          <td>${sale.payment || ""}</td>
          <td>${sale.quantity || ""}</td>
          <td style="text-align:right;">${prixUnitaire}</td>
          <td style="text-align:right;">${formatAr(sale.salePrice)}</td>
          <td style="text-align:center;">
            <span class="action-edit" title="Modifier" style="cursor:pointer;">✏️</span>
            <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;">🗑️</span>
          </td>
        `;
        tbody.appendChild(tr);
      });
      renderServicePagination(totalItems, paginated.length);
      attachSaleActions(); // Ré-attacher les écouteurs
    } catch (error) {
      console.error("Erreur lors du rendu du tableau des services:", error);
    }
}

async function getMovementsData(forceRefresh = false) {
    const now = Date.now();
    if (!cachedMovements || forceRefresh || (now - lastFetchTime > CACHE_DURATION)) {
      try {
        const res = await fetch("/api/movements");
        cachedMovements = await res.json();
        lastFetchTime = now;
      } catch (error) {
        console.error("Erreur lors du chargement des mouvements:", error);
        return cachedMovements || [];
      }
    }
    return cachedMovements;
}

// Dans history.js

async function renderMouvementsTable() {
    try {
      let movements = await getMovementsData();
      let filteredMovements = applyDateFilter(movements);

      // --- Filtres (inchangés) ---
      const search = document.getElementById("searchMouvementInput")?.value.toLowerCase() || "";
      const typeFilter = document.getElementById("typeMovementFilter")?.value || "";
      const minAmount = Number(document.getElementById("minPriceMouvement")?.value) || null;
      const maxAmount = Number(document.getElementById("maxPriceMouvement")?.value) || null;

      filteredMovements = filteredMovements.filter(movement => {
        if (search && !(movement.description || "").toLowerCase().includes(search)) return false;
        if (typeFilter && movement.type !== typeFilter) return false;
        if (minAmount !== null && movement.price < minAmount) return false;
        if (maxAmount !== null && movement.price > maxAmount) return false;
        return true;
      });

      // Tri
      filteredMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Pagination
      const totalItems = filteredMovements.length;
      let paginatedMovements = filteredMovements;
      if (mouvementItemsPerPage !== "all") {
        paginatedMovements = filteredMovements.slice(
          (mouvementCurrentPage - 1) * mouvementItemsPerPage,
          mouvementCurrentPage * mouvementItemsPerPage
        );
      }

      const tbody = document.querySelector("#mouvementsTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      paginatedMovements.forEach(movement => {
        const dateFormatee = formatDate(movement.date);
        const typeAffiche = movement.type === "spent" ? "Dépense" : "Décaissement";
        const moveId = movement.id || "";

        const tr = document.createElement("tr");
        tr.setAttribute("data-id", moveId);
        
        // --- C'est ici qu'on ajoute les boutons demandés ---
        tr.innerHTML = `
          <td>${dateFormatee}</td>
          <td>${typeAffiche}</td>
          <td>${movement.description}</td>
          <td style="text-align:right;">${formatAr(movement.price)}</td>
          <td style="text-align:center;">
            ${moveId ? `
            <span class="action-edit" title="Modifier" style="cursor:pointer;">✏️</span>
            <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;">🗑️</span>
            ` : ''}
          </td>
        `;
        tbody.appendChild(tr);
      });

      renderMouvementPagination(totalItems, paginatedMovements.length);
      attachMovementActions(); // On attache les événements après le rendu

    } catch (error) {
      console.error("Erreur lors du rendu du tableau des mouvements:", error);
    }
}

function attachMovementActions() {
    // Nettoyage des anciens écouteurs
    $("#mouvementsTable .action-edit, #mouvementsTable .action-delete").off('click');

    // Écouteur pour MODIFIER
    $("#mouvementsTable .action-edit").on('click', function() {
        const id = $(this).closest("tr").data("id");
        if(id) editMovement(id);
    });

    // Écouteur pour SUPPRIMER
    $("#mouvementsTable .action-delete").on('click', function() {
        const id = $(this).closest("tr").data("id");
        if(id) deleteMovement(id);
    });
}

async function deleteMovement(id) {
    if (confirm("Voulez-vous vraiment supprimer ce mouvement ?")) {
      try {
        const res = await fetch(`/api/movements/${id}`, { method: "DELETE" });
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.message || 'Erreur serveur');

        alert(result.message || "Mouvement supprimé !");

        // On rafraîchit tout pour mettre à jour le tableau et les totaux
        await refreshAllData();

      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur : " + error.message);
      }
    }
}

function attachSaleActions() {
    // Détacher les anciens écouteurs pour éviter les doublons
    $("#salesTable .action-edit, #salesTable .action-delete").off('click');
    $("#salesServiceTable .action-edit, #salesServiceTable .action-delete").off('click');

    // Attacher les nouveaux écouteurs
    $("#salesTable .action-edit").on('click', function() {
        const id = $(this).closest("tr").data("id");
        editSale(id, false); // false = produit
    });
    $("#salesTable .action-delete").on('click', function() {
        const id = $(this).closest("tr").data("id");
        deleteSale(id);
    });
    $("#salesServiceTable .action-edit").on('click', function() {
        const id = $(this).closest("tr").data("id");
        editSale(id, true); // true = service
    });
    $("#salesServiceTable .action-delete").on('click', function() {
        const id = $(this).closest("tr").data("id");
        deleteSale(id);
    });
}

async function editSale(id, isService) {
    const sale = cachedSales.find(s => s.id == id);
    if (!sale) {
      alert("Erreur : Vente non trouvée.");
      return;
    }

    if (isService) {
      createServiceEditModal();
      const modal = document.getElementById("editServiceModal");
      const service = cachedServices.find(s => s.name === sale.name);

      // Remplir les champs
      const serviceSelectElement = document.getElementById('edit-serviceSelect');
      if (service) {
        serviceSelectElement.value = service.id; // Définit la valeur du <select>
      } else {
        serviceSelectElement.value = ""; // Vide le <select> si non trouvé
      }

      const selectedServiceOption = serviceSelectElement.options[serviceSelectElement.selectedIndex];
      const serviceDisplayText = selectedServiceOption ? selectedServiceOption.text : "Sélectionner un service";
      const serviceDisplaySpan = document.getElementById('select2-edit-serviceSelect-container'); // Cible le span Select2
      if (serviceDisplaySpan) {
          serviceDisplaySpan.textContent = serviceDisplayText;
          serviceDisplaySpan.title = serviceDisplayText; // Met aussi à jour l'infobulle
      }
      
      // CORRECTION : Déclencher 'change' pour Select2
      // $('#edit-serviceSelect').trigger('change');

      document.getElementById('edit-serviceQuantity').value = sale.quantity;
      document.getElementById('edit-servicePayment').value = sale.payment;

      // Recalculer le prix initial
      calculateEditServicePrice();

      // Utilisation correcte de .off().on() pour éviter les doublons d'écouteurs
      $("#edit-serviceSelect").off("change").on("change", calculateEditServicePrice);
      $("#edit-serviceQuantity").off("input").on("input", calculateEditServicePrice);

      document.getElementById('editServiceForm').onsubmit = async function(e) {
        e.preventDefault();

        const selectedServiceId = document.getElementById('edit-serviceSelect').value;
        const selectedService = cachedServices.find(s => s.id == selectedServiceId);
        if (!selectedService) {
            alert("Le service sélectionné n'est plus disponible.");
            return;
        }
        const selectedProduit = cachedStocks.find(p => p.id == selectedService.produitId);
        if (!selectedProduit) {
            alert("Le produit associé à ce service n'est plus disponible.");
            return;
        }

        const updatedSale = {
          id: sale.id,
          name: selectedService.name,
          category: "service",
          produit: selectedProduit.name,
          quantity: Number(document.getElementById('edit-serviceQuantity').value),
          salePrice: Number(document.getElementById('edit-servicePrice').value),
          unitPrice: Number(selectedService.price),
          payment: document.getElementById('edit-servicePayment').value,
          date: sale.date
        };

        try {
          const res = await fetch(`/api/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSale)
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.message || 'Erreur serveur');

          alert(result.message || 'Vente modifiée avec succès !');
          modal.style.display = 'none';
          await refreshAllData();

        } catch (err) {
          console.error("Erreur lors de la modification:", err);
          alert("Erreur lors de la modification : " + err.message);
        }
      };

      modal.style.display = 'flex';
      document.getElementById('cancelEditService').onclick = () => modal.style.display = 'none';

    } else { // C'est un produit
      createProductEditModal();
      const modal = document.getElementById("editProductModal");
      const produit = cachedStocks.find(p => p.name === sale.produit);

      // Remplir les champs
      const produitSelectElement = document.getElementById('edit-produits');
      if (produit) {
        produitSelectElement.value = produit.id; // Définit la valeur du <select>
      } else {
        produitSelectElement.value = ""; // Vide le <select> si non trouvé
      }

      const selectedProduitOption = produitSelectElement.options[produitSelectElement.selectedIndex];
      const produitDisplayText = selectedProduitOption ? selectedProduitOption.text : "Sélectionner un produit";
      const produitDisplaySpan = document.getElementById('select2-edit-produits-container'); // Cible le span Select2
      if (produitDisplaySpan) {
          produitDisplaySpan.textContent = produitDisplayText;
          produitDisplaySpan.title = produitDisplayText; // Met aussi à jour l'infobulle
      }

      document.getElementById('edit-quantity').value = sale.quantity;
      document.getElementById('edit-payment').value = sale.payment;

      // CORRECTION : Appeler calculateEditProductPrice pour l'état initial
      calculateEditProductPrice();

      // Utilisation correcte de .off().on() pour éviter les doublons d'écouteurs
      $("#edit-produits").off("change").on("change", calculateEditProductPrice);
      $("#edit-quantity").off("input").on("input", calculateEditProductPrice);


      document.getElementById('editProductForm').onsubmit = async function(e) {
        e.preventDefault();

        const selectedProduitId = document.getElementById('edit-produits').value;
        const selectedProduit = cachedStocks.find(p => p.id == selectedProduitId);
        if (!selectedProduit) {
            alert("Le produit sélectionné n'est plus disponible.");
            return;
        }

        const updatedSale = {
          id: sale.id,
          produit: selectedProduit.name,
          category: document.getElementById('edit-category').value, // Prendre la valeur affichée
          quantity: Number(document.getElementById('edit-quantity').value),
          salePrice: Number(document.getElementById('edit-price').value),
          unitPrice: selectedProduit.salePrice,
          payment: document.getElementById('edit-payment').value,
          date: sale.date
        };

        try {
          const res = await fetch(`/api/sales/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSale)
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.message || 'Erreur serveur');

          alert(result.message || 'Vente modifiée avec succès !');
          modal.style.display = 'none';
          await refreshAllData();

        } catch (err) {
          console.error("Erreur lors de la modification:", err);
          alert("Erreur lors de la modification : " + err.message);
        }
      };

      modal.style.display = 'flex';
      document.getElementById('cancelEditProduct').onclick = () => modal.style.display = 'none';
    }
}

async function deleteSale(id) {
    const sale = cachedSales.find(s => s.id == id);
    if (!sale) return;

    const confirmMsg = sale.category === 'service'
      ? `Voulez-vous vraiment supprimer la vente du service : [${sale.name}] ?`
      : `Voulez-vous vraiment supprimer la vente du produit : [${sale.produit}] ?`;

    if (confirm(confirmMsg + "\n\nCette action restaurera également le stock.")) {
      try {
        const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Erreur serveur');

        alert(result.message || "Vente supprimée et stock restauré !");

        await refreshAllData();

      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression : " + error.message);
      }
    }
}

async function refreshAllData() {
    // Forcer le rechargement des données
    await getSalesData(true);
    await getStocksData(true);
    await getServicesData(true);
    await getMovementsData(true);

    setupCategoryFilter(cachedSales);

    // Rafraîchir l'onglet actuellement visible
    if (document.getElementById('tabContentProduit')?.style.display !== 'none') renderTable();
    if (document.getElementById('tabContentService')?.style.display !== 'none') renderSalesServiceTable();
    if (document.getElementById('tabContentMouvements')?.style.display !== 'none') renderMouvementsTable();

    loadAndUpdateTotals();
}

async function getSalesData(forceRefresh = false) {
    const now = Date.now();
    if (!cachedSales || forceRefresh || (now - lastFetchTime > CACHE_DURATION)) {
      try {
        const res = await fetch("/api/sales");
        cachedSales = await res.json();
        lastFetchTime = now; // Mettre à jour le temps après succès
      } catch (error) {
        console.error("Erreur lors du chargement des ventes:", error);
        return cachedSales || []; // Retourner l'ancien cache si erreur
      }
    }
    return cachedSales;
}

async function getStocksData(forceRefresh = false) {
    const now = Date.now();
    if (!cachedStocks || forceRefresh || (now - lastFetchTime > CACHE_DURATION)) {
      try {
        const res = await fetch("/api/stocks");
        cachedStocks = await res.json();
        lastFetchTime = now;
      } catch (error) {
        console.error("Erreur lors du chargement des stocks:", error);
        return cachedStocks || [];
      }
    }
    return cachedStocks;
}

async function getServicesData(forceRefresh = false) {
    const now = Date.now();
    if (!cachedServices || forceRefresh || (now - lastFetchTime > CACHE_DURATION)) {
      try {
        const res = await fetch("/api/services");
        cachedServices = await res.json();
        lastFetchTime = now;
      } catch (error) {
        console.error("Erreur lors du chargement des services:", error);
        return cachedServices || [];
      }
    }
    return cachedServices;
}

function formatDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ""; // Vérification date invalide
      // Utiliser les options de toLocaleDateString pour le format JJ/MM/AA
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", dateString, error);
      return "Date invalide"; // Retourner un message clair
    }
}

function formatAr(price) {
    // Gérer null, undefined, ou non-nombre
    if (price == null || isNaN(price)) {
        return '0 Ar'; // Ou une autre valeur par défaut
    }
    return Number(price)
        .toLocaleString('fr-FR') // Format avec séparateurs
        .replace(/\s/g, '.')     // Remplacer espaces par points
        + ' Ar';
}

async function loadAndUpdateTotals() {
    try {
      // Get sales and movements data (already fetched or from cache)
      const sales = await getSalesData();
      const movements = await getMovementsData(); // Ensure movements are fetched

      // Apply date filter based on selectedDate
      let filteredSales = applyDateFilter(sales);
      let filteredMovements = applyDateFilter(movements); // Filter movements too

      // Calculate totals for products and services (existing logic)
      const totalProduits = filteredSales
        .filter(s => s.category !== "service")
        .reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);

      const totalServices = filteredSales
        .filter(s => s.category === "service")
        .reduce((sum, sale) => sum + (Number(sale.salePrice) || 0), 0);

      // --- AJOUT : Calculer le total des mouvements (dépenses + décaissements) ---
      const totalMovements = filteredMovements
        .reduce((sum, movement) => sum + (Number(movement.price) || 0), 0);
      // --- Fin de l'ajout ---

      // MODIFICATION : Calculer la recette globale en soustrayant les mouvements
      const recetteGlobale = totalProduits + totalServices - totalMovements;

      // Update display elements
      const recetteProduitElem = document.getElementById('recetteProduit');
      if (recetteProduitElem) {
        recetteProduitElem.textContent = `${formatAr(totalProduits)}`;
      }
      const recetteServiceElem = document.getElementById('recetteService');
      if (recetteServiceElem) {
        recetteServiceElem.textContent = `${formatAr(totalServices)}`;
      }
      // --- AJOUT : Mettre à jour l'affichage des mouvements ---
      const recetteMovementElem = document.getElementById('recetteMovement');
      if (recetteMovementElem) {
        // Afficher avec un signe moins car ce sont des sorties d'argent
        recetteMovementElem.textContent = `${formatAr(totalMovements)}`;
      }
      // --- Fin de l'ajout ---

      const totalRecetteElem = document.getElementById('totalRecette');
      if (totalRecetteElem) {
        totalRecetteElem.textContent = `${formatAr(recetteGlobale)}`;
        totalRecetteElem.style.fontSize = '1.1em';
        // Optionnel : Mettre en rouge si le total est négatif
        totalRecetteElem.style.color = recetteGlobale < 0 ? '#e00955' : '#3893db'; // Rouge si négatif, bleu sinon
      }
    } catch (error) {
      console.error("Erreur lors du chargement des totaux:", error);
      // Afficher 0 en cas d'erreur pour éviter des affichages vides
      $('#recetteProduit').text('0 Ar');
      $('#recetteService').text('0 Ar');
      $('#recetteMovement').text('- 0 Ar').css('color', '#1a7f37');
      $('#totalRecette').text('0 Ar').css('color', '#3893db');
    }
}

function renderPagination(totalItems, paginatedCount) {
    const navId = "paginationNav"; // ID pour la pagination des produits
    const nav = document.getElementById(navId);
    if (!nav) return;
    nav.style.marginTop = "20px";
    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.gap = "10px";
    nav.innerHTML = `
      <button id="${navId}-prevPage">&lt;</button>
      <span id="${navId}-pageInfo"></span>
      <button id="${navId}-nextPage">&gt;</button>
      <select id="${navId}-itemsPerPageSelect">
        <option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="all">Tous</option>
      </select>
      <span id="${navId}-shownCount" style="margin-left:10px;">${paginatedCount} affiché(s) sur ${totalItems}</span>
    `;
    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(totalItems / itemsPerPage);
    document.getElementById(`${navId}-pageInfo`).textContent =
      itemsPerPage === "all" ? `Tous les résultats` : `Page ${currentPage} / ${totalPages}`;
    document.getElementById(`${navId}-prevPage`).disabled = (currentPage === 1);
    document.getElementById(`${navId}-nextPage`).disabled = (currentPage === totalPages || itemsPerPage === "all");
    document.getElementById(`${navId}-prevPage`).onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
    document.getElementById(`${navId}-nextPage`).onclick = () => { if (itemsPerPage !== "all" && currentPage < totalPages) { currentPage++; renderTable(); } };
    const itemsPerPageSelect = document.getElementById(`${navId}-itemsPerPageSelect`);
    if (itemsPerPageSelect) {
      itemsPerPageSelect.value = itemsPerPage;
      itemsPerPageSelect.onchange = function () { itemsPerPage = this.value === "all" ? "all" : Number(this.value); currentPage = 1; renderTable(); };
    }
}

function renderServicePagination(totalItems, paginatedCount) {
      const navId = "paginationServiceNav"; // ID pour la pagination des services
      const nav = document.getElementById(navId);
      if (!nav) return;
      nav.style.marginTop = "20px";
      nav.style.display = "flex";
      nav.style.alignItems = "center";
      nav.style.gap = "10px";
      nav.innerHTML = `
        <button id="${navId}-prevPage">&lt;</button>
        <span id="${navId}-pageInfo"></span>
        <button id="${navId}-nextPage">&gt;</button>
        <select id="${navId}-itemsPerPageSelect">
          <option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="all">Tous</option>
        </select>
        <span id="${navId}-shownCount" style="margin-left:10px;">${paginatedCount} affiché(s) sur ${totalItems}</span>
      `;
      const totalPages = serviceItemsPerPage === "all" ? 1 : Math.ceil(totalItems / serviceItemsPerPage);
      document.getElementById(`${navId}-pageInfo`).textContent =
        serviceItemsPerPage === "all" ? `Tous les résultats` : `Page ${serviceCurrentPage} / ${totalPages}`;
      document.getElementById(`${navId}-prevPage`).disabled = (serviceCurrentPage === 1);
      document.getElementById(`${navId}-nextPage`).disabled = (serviceCurrentPage === totalPages || serviceItemsPerPage === "all");
      document.getElementById(`${navId}-prevPage`).onclick = () => { if (serviceCurrentPage > 1) { serviceCurrentPage--; renderSalesServiceTable(); } };
      document.getElementById(`${navId}-nextPage`).onclick = () => { if (serviceItemsPerPage !== "all" && serviceCurrentPage < totalPages) { serviceCurrentPage++; renderSalesServiceTable(); } };
      const serviceItemsPerPageSelect = document.getElementById(`${navId}-itemsPerPageSelect`);
      if (serviceItemsPerPageSelect) {
        serviceItemsPerPageSelect.value = serviceItemsPerPage;
        serviceItemsPerPageSelect.onchange = function () { serviceItemsPerPage = this.value === "all" ? "all" : Number(this.value); serviceCurrentPage = 1; renderSalesServiceTable(); };
      }
}

function renderMouvementPagination(totalItems, paginatedCount) {
      const navId = "paginationMouvementNav"; // ID pour la pagination des mouvements
      const nav = document.getElementById(navId);
      if (!nav) return;
      nav.style.marginTop = "20px";
      nav.style.display = "flex";
      nav.style.alignItems = "center";
      nav.style.gap = "10px";
      nav.innerHTML = `
        <button id="${navId}-prevPage">&lt;</button>
        <span id="${navId}-pageInfo"></span>
        <button id="${navId}-nextPage">&gt;</button>
        <select id="${navId}-itemsPerPageSelect">
          <option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="all">Tous</option>
        </select>
        <span id="${navId}-shownCount" style="margin-left:10px;">${paginatedCount} affiché(s) sur ${totalItems}</span>
      `;
      const totalPages = mouvementItemsPerPage === "all" ? 1 : Math.ceil(totalItems / mouvementItemsPerPage);
      document.getElementById(`${navId}-pageInfo`).textContent =
        mouvementItemsPerPage === "all" ? `Tous les résultats` : `Page ${mouvementCurrentPage} / ${totalPages || 1}`;
      document.getElementById(`${navId}-prevPage`).disabled = (mouvementCurrentPage === 1);
      document.getElementById(`${navId}-nextPage`).disabled = (mouvementCurrentPage === totalPages || mouvementItemsPerPage === "all");
      document.getElementById(`${navId}-prevPage`).onclick = () => { if (mouvementCurrentPage > 1) { mouvementCurrentPage--; renderMouvementsTable(); } };
      document.getElementById(`${navId}-nextPage`).onclick = () => { if (mouvementItemsPerPage !== "all" && mouvementCurrentPage < totalPages) { mouvementCurrentPage++; renderMouvementsTable(); } };
      const itemsPerPageSelect = document.getElementById(`${navId}-itemsPerPageSelect`);
      if (itemsPerPageSelect) {
        itemsPerPageSelect.value = mouvementItemsPerPage;
        itemsPerPageSelect.onchange = function () { mouvementItemsPerPage = this.value === "all" ? "all" : Number(this.value); mouvementCurrentPage = 1; renderMouvementsTable(); };
      }
}

function createProductEditModal() {
  if (document.getElementById("editProductModal")) return;

  const modal = document.createElement("div");
  modal.id = "editProductModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.zIndex = "1000"; // S'assurer qu'il est au-dessus
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.5)"; // Fond semi-transparent
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";

  modal.innerHTML = `
    <div class="modal-content" style="background:#fff;padding:20px 30px 30px 30px;border-radius:10px;min-width:300px;max-width:90vw; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h2 class="title" style="margin-top:0;">Modifier la Vente (Produit)</h2>
      <form id="editProductForm">
        <select name="produits" id="edit-produits" class="js-example-basic-single" style="width:100%; margin-bottom: 10px;">
          <option value="">Sélectionner un produit</option>
        </select>
        <div class="item-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px;">
          <input type="number" id="edit-quantity" placeholder="Quantité" required min="1" style="padding: 8px;">
          <input type="number" id="edit-price" placeholder="Prix de vente" style="padding: 8px;">
          <select name="category" id="edit-category" style="padding: 8px;">
            <option value="">Catégorie</option>
          </select>
          <select name="payment" id="edit-payment" required style="padding: 8px;">
            <option value="cash">Cash</option>
            <option value="mobile money">Mobile Money</option>
          </select>
        </div>
        <div class="modal-actions" style="display:flex; justify-content: space-between; margin-top: 20px;">
          <button type="button" style="background-color: #6c757d; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;" id="cancelEditProduct">Annuler</button>
          <button type="submit" style="background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const select = document.getElementById('edit-produits');
  // S'assurer que cachedStocks existe avant de l'utiliser
  (cachedStocks || []).forEach((p) => {
    select.options.add(new Option(
      `${p.name} - ${formatAr(p.salePrice)} - ${p.stock} en stock`,
      p.id
    ));
  });

  $('#edit-produits').select2({
    placeholder: "Sélectionner un produit",
    dropdownParent: $('#editProductModal') // Assure que le dropdown s'affiche correctement
  });
}

function createServiceEditModal() {
  if (document.getElementById("editServiceModal")) return;

  const modal = document.createElement("div");
  modal.id = "editServiceModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.zIndex = "1000"; // S'assurer qu'il est au-dessus
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.5)"; // Fond semi-transparent
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";

  modal.innerHTML = `
    <div class="modal-content" style="background:#fff;padding:20px 30px 30px 30px;border-radius:10px;min-width:300px;max-width:90vw; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h2 class="title" style="margin-top:0;">Modifier la Vente (Service)</h2>
      <form id="editServiceForm">
        <div class="form-group-01" style="margin-bottom: 10px;">
          <select id="edit-serviceSelect" class="js-example-basic-single" required style="width:100%;">
            <option value="">Sélectionner un service</option>
          </select>
        </div>
        <div class="form-group-02" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 15px;">
          <input type="number" id="edit-serviceQuantity" min="1" required placeholder="Quantité" style="padding: 8px;">
          <input type="number" id="edit-servicePrice" required placeholder="Prix du service" style="padding: 8px;">
          <select id="edit-servicePayment" required style="padding: 8px;">
            <option value="cash">Cash</option>
            <option value="mobile money">Mobile Money</option>
          </select>
        </div>
        <div class="modal-actions" style="display:flex; justify-content: space-between; margin-top: 20px;">
          <button type="button" style="background-color: #6c757d; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;" id="cancelEditService">Annuler</button>
          <button type="submit" style="background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const select = document.getElementById('edit-serviceSelect');
  // S'assurer que cachedServices existe
  (cachedServices || []).forEach(s => {
    select.options.add(new Option(`${s.name} - ${formatAr(s.price)}`, s.id));
  });

  $('#edit-serviceSelect').select2({
    placeholder: "Rechercher un service",
    dropdownParent: $('#editServiceModal') // Assure affichage correct
  });
}

// Dans history.js

// 1. Fonction pour créer le HTML de la modale (si elle n'existe pas encore)
function createMovementEditModal() {
  if (document.getElementById("editMovementModal")) return;

  const modal = document.createElement("div");
  modal.id = "editMovementModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.zIndex = "1000";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.5)";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";

  modal.innerHTML = `
    <div class="modal-content" style="background:#fff;padding:20px 30px 30px 30px;border-radius:10px;min-width:300px;max-width:90vw; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <h2 class="title" style="margin-top:0;">Modifier le Mouvement</h2>
      <form id="editMovementForm">
        <div style="display: flex; flex-direction: column; gap: 15px;">
            
            <select id="edit-mov-type" required style="padding: 8px;">
                <option value="spent">Dépense</option>
                <option value="disburse">Décaissement</option>
            </select>

            <input type="text" id="edit-mov-description" placeholder="Description" required style="padding: 8px;">

            <input type="number" id="edit-mov-price" placeholder="Montant" required min="0" style="padding: 8px;">
            
        </div>

        <div class="modal-actions" style="display:flex; justify-content: space-between; margin-top: 20px;">
          <button type="button" style="background-color: #6c757d; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;" id="cancelEditMovement">Annuler</button>
          <button type="submit" style="background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">Enregistrer</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

// 2. Fonction appelée quand on clique sur le crayon
async function editMovement(id) {
    // On s'assure que les données sont chargées
    const movements = await getMovementsData();
    const movement = movements.find(m => m.id == id);
    
    if (!movement) {
        alert("Erreur : Mouvement introuvable.");
        return;
    }

    // Créer la modale si elle n'existe pas
    createMovementEditModal();
    const modal = document.getElementById("editMovementModal");
    
    // Remplir les champs avec les valeurs actuelles
    document.getElementById('edit-mov-type').value = movement.type;
    document.getElementById('edit-mov-description').value = movement.description;
    document.getElementById('edit-mov-price').value = movement.price;

    // Gestion du bouton Annuler
    document.getElementById('cancelEditMovement').onclick = () => modal.style.display = 'none';

    // Gestion de la soumission du formulaire
    document.getElementById('editMovementForm').onsubmit = async function(e) {
        e.preventDefault();

        const updatedMovement = {
            id: movement.id, // On garde l'ID
            type: document.getElementById('edit-mov-type').value,
            description: document.getElementById('edit-mov-description').value,
            price: Number(document.getElementById('edit-mov-price').value),
            date: movement.date // On garde la date originale
        };

        try {
            const res = await fetch(`/api/movements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedMovement)
            });
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Erreur serveur');

            alert(result.message || 'Mouvement modifié avec succès !');
            modal.style.display = 'none';
            
            // Rafraîchir l'interface
            await refreshAllData();

        } catch (err) {
            console.error("Erreur lors de la modification:", err);
            alert("Erreur : " + err.message);
        }
    };

    // Afficher la modale
    modal.style.display = 'flex';
}

function calculateEditProductPrice() {
    const selectedId = $('#edit-produits').val();
    const produit = cachedStocks.find(p => p.id == selectedId);
    const quantity = Number($('#edit-quantity').val()) || 1;
    const categorySelect = document.getElementById('edit-category'); // Cible le select catégorie

    if (produit && produit.salePrice) {
      // Calculer et afficher le prix total
      $('#edit-price').val(produit.salePrice * quantity);
      // Mettre à jour le select catégorie avec la catégorie du PRODUIT sélectionné
      categorySelect.innerHTML = `<option value="${produit.category || ''}">${produit.category || 'N/A'}</option>`;
      // Optionnel : Désactiver le select si on ne veut pas permettre de changer la catégorie ici
      // categorySelect.disabled = true;
    } else {
      // Vider le prix et la catégorie si aucun produit valide n'est sélectionné
      $('#edit-price').val('');
      categorySelect.innerHTML = `<option value="">Catégorie</option>`;
      // categorySelect.disabled = true;
    }
}

function calculateEditServicePrice() {
    const serviceId = $('#edit-serviceSelect').val();
    const quantity = Number($('#edit-serviceQuantity').val()) || 1;
    const service = cachedServices.find(s => s.id == serviceId);

    if (!service) {
      $('#edit-servicePrice').val("");
      return;
    }
    const price = (Number(service.price) || 0) * quantity;
    $('#edit-servicePrice').val(price);
}