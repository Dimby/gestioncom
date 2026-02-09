import { getFormLabel } from '../utils.js';

document.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/stocks");
  const stocks = await res.json();

  // Prépare la liste des catégories uniques
  const categories = [...new Set(stocks.map(s => s.category).filter(Boolean))];
  const categoryFilter = document.getElementById("categoryFilter");
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = getFormLabel(cat);
    categoryFilter.appendChild(opt);
  });

  let currentPage = 1;
  let itemsPerPage = 10;

  function renderPagination(totalItems, paginatedCount) {
    const nav = document.getElementById("paginationNav") || document.createElement("div");
    nav.id = "paginationNav";
    nav.style.marginTop = "20px";
    nav.style.display = "flex";
    nav.style.alignItems = "center";
    nav.style.gap = "10px";

    nav.innerHTML = `
      <button id="prevPage">&lt;</button>
      <span id="pageInfo"></span>
      <button id="nextPage">&gt;</button>
      <select id="itemsPerPageSelect">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="all">Tous</option>
      </select>
      <span id="shownCount" style="margin-left:10px;">${paginatedCount} affiché(s)</span>
    `;
    document.getElementById("stocks").after(nav);

    const totalPages = itemsPerPage === "all" ? 1 : Math.ceil(totalItems / itemsPerPage);
    document.getElementById("pageInfo").textContent =
      itemsPerPage === "all"
        ? `Tous les résultats`
        : `Page ${currentPage} / ${totalPages}`;

    document.getElementById("prevPage").onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    };
    document.getElementById("nextPage").onclick = () => {
      if (itemsPerPage !== "all" && currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    };
    document.getElementById("itemsPerPageSelect").value = itemsPerPage;
    document.getElementById("itemsPerPageSelect").onchange = function () {
      itemsPerPage = this.value === "all" ? "all" : Number(this.value);
      currentPage = 1;
      renderTable();
    };
  }

  function formatDateDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  function renderTable() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const cat = categoryFilter.value;
    // Utiliser l'opérateur optionnel pour éviter les erreurs si les éléments n'existent pas
    const minPrice = document.getElementById("minPrice")?.value || "";
    const maxPrice = document.getElementById("maxPrice")?.value || "";
    const minDate = document.getElementById("minDate").value;
    const maxDate = document.getElementById("maxDate").value;

    const filterLowStock = document.getElementById("lowStockSwitch").checked;

    let filtered = stocks.filter(p => {
      // Recherche produit/catégorie
      if (
        search &&
        !(
          (p.name || "").toLowerCase().includes(search) ||
          (p.category || "").toLowerCase().includes(search)
        )
      ) return false;
      // Filtre catégorie
      if (cat && p.category !== cat) return false;
      // Filtre prix - seulement si les éléments existent
      if (minPrice && p.purchasePrice < Number(minPrice)) return false;
      if (maxPrice && p.purchasePrice > Number(maxPrice)) return false;
      // Filtre date (sur la dernière entrée d'historique)
      if (minDate || maxDate) {
        let lastDate = null;
        if (Array.isArray(p.history) && p.history.length > 0) {
          lastDate = p.history[p.history.length - 1].date;
        }
        if (lastDate) {
          if (minDate && lastDate < minDate) return false;
          if (maxDate && lastDate > maxDate) return false;
        }
      }

      if (filterLowStock && (p.stock || 0) > 5) {
        return false;
      }

      return true;
    });

    // Récupérer le mode de tri sélectionné
    const sortOrder = document.getElementById("sortOrder").value;

    // Appliquer le tri selon l'option sélectionnée
    switch (sortOrder) {
      case "nameAsc":
        // Tri alphabétique croissant (A-Z)
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        // Tri alphabétique décroissant (Z-A)
        filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "soldAsc":
        // Tri par nombre de ventes croissant
        filtered.sort((a, b) => (a.sold || 0) - (b.sold || 0));
        break;
      case "soldDesc":
      default:
        // Tri par nombre de ventes décroissant (par défaut)
        filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
        break;
    }

    // Pagination
    const totalItems = filtered.length;
    let paginated = filtered;
    if (itemsPerPage !== "all") {
      paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
    }

    // Génère le tableau HTML
    let html = `
      <table border="1" id="stocksTable">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Catégorie</th>
            <th>Prix d'achat</th>
            <th>Prix de vente</th>
            <th>Vendus</th>
            <th>Stock</th>
            <th>(PV * V)</th>
            <th>(PV * S)</th>
            <th>Dernière entrée</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
    `;
    paginated.forEach(p => {
      const lastHistory = Array.isArray(p.history) && p.history.length > 0
        ? new Date(p.history[p.history.length - 1].date).toLocaleString('fr-FR')
        : "";
      const totalAchat = (p.salePrice || 0) * (p.stock || 0);
      const totalVente = (p.salePrice || 0) * (p.sold || 0);
      html += `
        <tr data-id="${p.id}">
          <td>${p.name || ""}</td>
          <td>${getFormLabel(p.category) || ""}</td>
          <td style="text-align:right;">${formatAr(p.purchasePrice)}</td>
          <td style="text-align:right;">${formatAr(p.salePrice)}</td>
          <td>${p.sold || 0}</td>
          <td>${p.stock || 0}</td>
          <td style="text-align:right;">${formatAr(totalVente)}</td>
          <td style="text-align:right;">${formatAr(totalAchat)}</td>
          <td>${lastHistory}</td>
          <td style="text-align:center;">
            <span class="action-edit" title="Modifier" style="cursor:pointer;">✏️</span>
            <span class="action-delete" title="Supprimer" style="cursor:pointer;margin-left:8px;">🗑️</span>
          </td>
        </tr>
      `;
    });
    html += "</tbody></table>";
    document.getElementById("stocks").innerHTML = html;

    // Ajout du modal HTML si pas déjà présent
    if (!document.getElementById("editModal")) {
      const modal = document.createElement("div");
      modal.id = "editModal";
      modal.style.display = "none";
      modal.style.position = "fixed";
      modal.style.top = "0";
      modal.style.left = "0";
      modal.style.width = "100vw";
      modal.style.height = "100vh";
      modal.style.background = "rgba(0,0,0,0.3)";
      modal.style.justifyContent = "center";
      modal.style.alignItems = "center";
      // Ajoute le select des catégories dans le modal
      modal.innerHTML = `
        <div style="background:#fff;padding:20px 30px 30px 30px;border-radius:10px;min-width:300px;max-width:90vw;">
          <h3>Modifier le produit</h3>
          <form id="editForm">
            <label for="editName">Nom du produit</label>
            <input type="text" id="editName" placeholder="Nom" required>
            <label for="editCategorySelect">Catégorie</label>
            <select id="editCategorySelect" required>
              <option value="">Catégorie</option>
              ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
            </select>
            <label for="editPurchasePrice">Prix d'achat</label>  
            <input type="number" id="editPurchasePrice" placeholder="Prix d'achat" required>
            <label for="editSalePrice">Prix de vente</label>
            <input type="number" id="editSalePrice" placeholder="Prix de vente" required>
            <label for="editStock">Stock (Ex: 10 + Nouveau stock)</label>
            <input type="text" id="editStock" placeholder="Stock" required>
            
            <!-- Ajout du sélecteur de date pour modification rétroactive -->
            <div class="date-selector-container">
              <label for="editDate">Date de la modification</label>
              <input type="date" id="editDate" value="${new Date().toISOString().split('T')[0]}">
              <span class="helper-text">Laissez la date actuelle pour une modification standard</span>
            </div>
            
            <button type="submit">Valider</button>
            <button type="button" id="cancelEdit">Annuler</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Fonction pour évaluer une expression mathématique simple
    function evaluateStockExpression(expression, currentStock) {
      try {
        // Remplace le stock actuel (représenté par x) par sa valeur
        const sanitizedExpr = expression.replace(/x/gi, currentStock);
        
        // Vérifie si c'est une expression avec opérateur ou juste un nombre
        if (/[+\-*/]/.test(sanitizedExpr)) {
          // Évalue l'expression en toute sécurité
          // eslint-disable-next-line no-new-func
          return Function('"use strict"; return (' + sanitizedExpr + ')')();
        } else {
          // C'est juste un nombre
          return Number(sanitizedExpr);
        }
      } catch (e) {
        console.error("Erreur lors de l'évaluation de l'expression", e);
        return null; // Expression invalide
      }
    }

    // Fonction pour calculer le prix de vente
    function calculateSalePrice(purchasePrice) {
      // Calcul du prix de vente (40% de marge)
      return Math.round(purchasePrice * 1.4);
    }

    // Gestion des actions Edit et Delete
    document.querySelectorAll(".action-edit").forEach(btn => {
      btn.onclick = function() {
        const tr = this.closest("tr");
        const id = tr.getAttribute("data-id");
        const produit = filtered.find(p => p.id == id);
        if (!produit) return;
        
        // Remplir les champs du formulaire
        document.getElementById("editName").value = produit.name || "";
        const selectCat = document.getElementById("editCategorySelect");
        selectCat.value = produit.category || "";
        document.getElementById("editPurchasePrice").value = produit.purchasePrice || "";
        document.getElementById("editSalePrice").value = produit.salePrice || "";
        document.getElementById("editStock").value = produit.stock || "";
        
        // Ajouter l'écouteur d'événement pour mettre à jour le prix de vente
        document.getElementById("editPurchasePrice").addEventListener("input", function() {
          const purchasePrice = parseFloat(this.value) || 0;
          document.getElementById("editSalePrice").value = calculateSalePrice(purchasePrice);
        });
        
        document.getElementById("editModal").style.display = "flex";
        
        document.getElementById("editForm").onsubmit = async function(e) {
          e.preventDefault();
          const id = tr.getAttribute("data-id");
          const produit = filtered.find(p => p.id == id);
          if (!produit) return;

          let history = Array.isArray(produit.history) ? [...produit.history] : [];

          const newName = document.getElementById("editName").value.trim();
          const newCategory = selectCat.value;
          const newPurchasePrice = Number(document.getElementById("editPurchasePrice").value);
          let newSalePrice = Number(document.getElementById("editSalePrice").value);
          const stockExpression = document.getElementById("editStock").value;
          
          // Récupérer la date sélectionnée ou utiliser la date actuelle
          let selectedDate = document.getElementById("editDate").value;
          const isCustomDate = selectedDate && selectedDate !== new Date().toISOString().split('T')[0];
          
          // Si aucune date n'est sélectionnée, utiliser la date actuelle
          if (!selectedDate) {
            selectedDate = new Date().toISOString();
          } else {
            // Convertir la date du format YYYY-MM-DD à un objet Date avec l'heure actuelle
            const dateParts = selectedDate.split('-');
            const dateObj = new Date();
            dateObj.setFullYear(parseInt(dateParts[0]));
            dateObj.setMonth(parseInt(dateParts[1]) - 1); // Les mois sont indexés de 0 à 11
            dateObj.setDate(parseInt(dateParts[2]));
            selectedDate = dateObj.toISOString();
          }
          
          // Évaluer l'expression de stock
          const currentStock = produit.stock || 0;
          const newStock = evaluateStockExpression(stockExpression, currentStock);
          
          // Vérifier si l'expression est valide
          if (newStock === null) {
            alert("Expression de stock invalide. Utilisez un nombre ou une opération comme '30+12'.");
            return;
          }
          
          // Calculer le changement de stock
          const stockChange = newStock - currentStock;

          // Si le stock change, ajoute une entrée d'historique
          if (stockChange !== 0) {
            // Ajouter l'information sur la date rétroactive dans la note si nécessaire
            const notePrefix = isCustomDate ? "Modification rétroactive - " : "";
            
            history.push({
              date: selectedDate,
              change: stockChange,
              stockBefore: currentStock,
              purchasePrice: newPurchasePrice,
            salePrice: newSalePrice,
              note: `${notePrefix}Modification stock (${stockExpression})`
            });
          }

          // Si le prix d'achat change, ajoute priceChange dans l'historique
          if (newPurchasePrice !== produit.purchasePrice) {
            const notePrefix = isCustomDate ? "Modification rétroactive - " : "";
            history.push({
              date: selectedDate,
              change: 0,
              stockBefore: newStock,
              note: `${notePrefix}Changement de prix d'achat`,
              priceChange: {
                oldPurchasePrice: produit.purchasePrice,
                newPurchasePrice: newPurchasePrice
              }
            });

            // Si salePrice n'a pas été modifié, on le recalcule
            if (newSalePrice === produit.salePrice) {
              newSalePrice = Math.round(newPurchasePrice * 1.4);
            }
            // Sinon, on garde la valeur saisie par l'utilisateur
          }

          // Ajout pour l'historique du changement de prix de vente
          if (newSalePrice !== produit.salePrice) {
            const notePrefix = isCustomDate ? "Modification rétroactive - " : "";
            history.push({
              date: selectedDate,
              change: 0,
              stockBefore: newStock,
              note: `${notePrefix}Changement de prix de vente`,
              salePriceChange: {
                oldSalePrice: produit.salePrice,
                newSalePrice: newSalePrice
              }
            });
          }

          // Trier l'historique par date (pour s'assurer que les entrées sont dans l'ordre chronologique)
          history.sort((a, b) => new Date(a.date) - new Date(b.date));

          const updated = {
            id: produit.id,
            name: newName,
            category: newCategory,
            purchasePrice: newPurchasePrice,
            salePrice: newSalePrice,
            stock: newStock,
            sold: produit.sold || 0,
            history: history
          };

          await fetch(`/api/stocks/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
          });
          
          document.getElementById("editModal").style.display = "none";
          renderTable();
          window.location.reload();
        };
        document.getElementById("cancelEdit").onclick = function() {
          // Supprimer l'écouteur d'événement lors de la fermeture du modal
          document.getElementById("editPurchasePrice").removeEventListener("input", null);
          document.getElementById("editModal").style.display = "none";
        };
      };
    });

    document.querySelectorAll(".action-delete").forEach(btn => {
      btn.onclick = async function() {
        const tr = this.closest("tr");
        const id = tr.getAttribute("data-id");
        const contenu = document.querySelector(`tr[data-id='${id}'] td`).textContent.trim();
        if (confirm(`Voulez-vous vraiment supprimer le produit : [${contenu}] ?`)) {
          await fetch(`/api/stocks/${id}`, { method: "DELETE" });
          renderTable();
          window.location.reload(); // Actualise la page après suppression
        }
      };
    });

    renderPagination(totalItems, paginated.length);
  }

  // Ajout d'une vérification pour éviter les erreurs si un élément n'existe pas
  [
    "searchInput", "categoryFilter", "sortOrder", "minDate", "maxDate", "lowStockSwitch"
  ].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      const eventType = (element.type === 'checkbox') ? 'change' : 'input';
      element.addEventListener(eventType, renderTable);
      // Ajouter aussi 'change' pour les selects et dates si ce n'est pas déjà couvert par 'input'
      if (element.tagName === 'SELECT' || element.type === 'date') {
          element.addEventListener('change', renderTable);
      }
    }
  });

  // Ajout optionnel pour les filtres de prix si présents
  const minPriceElement = document.getElementById("minPrice");
  const maxPriceElement = document.getElementById("maxPrice");
  if (minPriceElement) minPriceElement.addEventListener("input", renderTable);
  if (maxPriceElement) maxPriceElement.addEventListener("input", renderTable);

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("categoryFilter").value = "";
    if (document.getElementById("minPrice")) document.getElementById("minPrice").value = "";
    if (document.getElementById("maxPrice")) document.getElementById("maxPrice").value = "";
    document.getElementById("sortOrder").value = "soldDesc"; // Réinitialiser le tri
    document.getElementById("minDate").value = "";
    document.getElementById("maxDate").value = "";
    document.getElementById("lowStockSwitch").checked = false;
    renderTable();
  });

  renderTable();
});

function formatAr(price) {
  return Number(price)
    .toLocaleString('fr-FR') // Donne "150 000"
    .replace(/\s/g, '.')     // Remplace espace insécable par point
    + ' Ar';
}