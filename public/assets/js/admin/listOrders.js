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
      supplier: order.supplier || product.supplier || "-",
      pieces: order.piecesQuantity
        ? formatOrderPieces(order)
        : (order.pieces || (product.piecesQuantity ? formatOrderPieces(product) : product.pieces) || "-"),
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

// Création de commande : cette fonctionnalité appartient à la liste des commandes.
const ORDER_DRAFT_KEY = "gestioncom.orderDraft.v1";
let orderProducts = [];
const ORDER_UNITS = [
  ["piece", "Pièce"],
  ["boite", "Boîte"],
  ["litre", "Litre"],
  ["kg", "Kilogramme"],
  ["metre", "Mètre"],
  ["rouleau", "Rouleau"],
  ["paquet", "Paquet"]
];

function normalizeOrderUnits(item = {}) {
  const match = String(item.pieces ?? "").trim().match(/^(\d+(?:[.,]\d+)?)\s*([^\d\s(]+)?/);
  const aliases = {
    pieces: "piece", "pièce": "piece", "pièces": "piece",
    boites: "boite", "boîte": "boite", "boîtes": "boite",
    litres: "litre", kilogramme: "kg", kilogrammes: "kg",
    mètre: "metre", mètres: "metre", rouleaux: "rouleau", paquets: "paquet"
  };
  const legacyCount = match ? Number(match[1].replace(",", ".")) : 1;
  return {
    piecesQuantity: Number(item.piecesQuantity) > 0
      ? Number(item.piecesQuantity)
      : (Number.isFinite(legacyCount) && legacyCount > 0 ? legacyCount : 1),
    piecesUnit: item.piecesUnit || aliases[match?.[2]?.toLowerCase()] || "piece"
  };
}

function formatOrderPieces(item) {
  const { piecesQuantity, piecesUnit } = normalizeOrderUnits(item);
  const labels = {
    piece: ["pièce", "pièces"], boite: ["boîte", "boîtes"],
    litre: ["litre", "litres"], kg: ["kg", "kg"],
    metre: ["mètre", "mètres"], rouleau: ["rouleau", "rouleaux"],
    paquet: ["paquet", "paquets"]
  };
  const unitLabels = labels[piecesUnit] || [piecesUnit, `${piecesUnit}s`];
  return `${piecesQuantity} ${piecesQuantity > 1 ? unitLabels[1] : unitLabels[0]}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("/api/products");
  orderProducts = await response.json();
  document.getElementById("simulateOrder").onclick = openOrderModal;
});

function openOrderModal() {
  let modal = document.getElementById("orderModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orderModal";
    modal.style.cssText = "display:none;position:fixed;z-index:1000;inset:0;background:rgba(0,0,0,.5);justify-content:center;align-items:center";
    modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:10px;max-height:730px;overflow:auto"><div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><h3 style="margin:0">Nouvelle commande</h3><button type="button" id="resetOrderDraft" title="Réinitialiser" aria-label="Réinitialiser" style="background:#f2f2f2;color:gray;padding:6px 8px;line-height:1">↺</button></div><table id="orderTable"><thead><tr><th>Produit</th><th>Fournisseur</th><th>Prix global</th><th>Nombre</th><th>Unité</th><th>Quantité commandée</th><th></th></tr></thead><tbody id="orderBody"></tbody></table><p><button id="addOrderLine">+ Ajouter ligne</button></p><strong>Total : <span id="orderTotal">0</span></strong><p><button id="closeOrderModal">Fermer</button><button id="sendOrderModal">Confirmer</button></p></div>`;
    document.body.appendChild(modal);
    modal.querySelector("#addOrderLine").onclick = () => addOrderLine();
    modal.querySelector("#closeOrderModal").onclick = () => { saveOrderDraft(); modal.style.display = "none"; };
    modal.querySelector("#sendOrderModal").onclick = sendOrder;
    modal.querySelector("#resetOrderDraft").onclick = () => {
      localStorage.removeItem(ORDER_DRAFT_KEY);
      const orderBody = modal.querySelector("#orderBody");
      orderBody.querySelectorAll(".order-product-select").forEach(sel => $(sel).select2("destroy"));
      orderBody.innerHTML = "";
      addOrderLine();
    };
    modal.onclick = e => { if (e.target === modal) { saveOrderDraft(); modal.style.display = "none"; } };
  }
  const body = modal.querySelector("#orderBody"); body.innerHTML = "";
  const draft = readOrderDraft(); (draft.length ? draft : [{}]).forEach(addOrderLine);
  modal.style.display = "flex";
}

function addOrderLine(line = {}) {
  const body = document.getElementById("orderBody"), row = document.createElement("tr");
  row.innerHTML = `<td><select class="order-product-select"><option value="">Sélectionner</option>${orderProducts.map(p => `<option value="${p.id}">${p.brand_name}</option>`).join("")}</select></td><td><input class="order-supplier" readonly></td><td><input type="number" min="0" class="order-price"></td><td><input type="number" min="0.01" step="any" class="order-pieces-quantity" required></td><td><select class="order-pieces-unit">${ORDER_UNITS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></td><td><input type="number" min="1" step="1" value="1" class="order-qty"></td><td><button class="remove-line">❌</button></td>`;
  body.appendChild(row);
  const select = row.querySelector(".order-product-select"); select.value = line.productId || "";
  const populate = () => {
    const p = orderProducts.find(x => String(x.id) === select.value);
    if (!p) return;
    const units = normalizeOrderUnits(line.productId ? line : p);
    row.querySelector(".order-supplier").value = p.supplier || "-";
    row.querySelector(".order-price").value = line.price ?? p.purchaseTotalPrice ?? 0;
    row.querySelector(".order-pieces-quantity").value = units.piecesQuantity;
    row.querySelector(".order-pieces-unit").value = units.piecesUnit;
    row.querySelector(".order-qty").value = line.quantity ?? 1;
    line = {};
    saveOrderDraft();
    updateOrderTotal();
  };
  // Select customisé avec recherche (comme #serviceSelect dans main.js).
  const dropdownParent = document.querySelector("#orderModal > div");
  $(select).select2({
    placeholder: "Rechercher un produit",
    width: "resolve",
    dropdownParent: dropdownParent || undefined,
  }).on("change", populate);
  // Les autres champs (hors sélecteur produit, géré séparément ci-dessus) déclenchent juste la sauvegarde du brouillon.
  row.querySelectorAll("input, select:not(.order-product-select)").forEach(input => {
    input.oninput = () => { saveOrderDraft(); updateOrderTotal(); };
    input.onchange = () => { saveOrderDraft(); updateOrderTotal(); };
  });
  row.querySelector(".remove-line").onclick = () => {
    $(select).select2("destroy");
    row.remove();
    saveOrderDraft();
    updateOrderTotal();
  };
  if (select.value) populate(); else updateOrderTotal();
}

function getOrderLines() {
  return [...document.querySelectorAll("#orderBody tr")].map(row => ({
    productId: row.querySelector(".order-product-select").value,
    price: Number(row.querySelector(".order-price").value) || 0,
    piecesQuantity: Number(row.querySelector(".order-pieces-quantity").value) || 0,
    piecesUnit: row.querySelector(".order-pieces-unit").value,
    quantity: Number(row.querySelector(".order-qty").value) || 0
  })).filter(line => line.productId);
}
function readOrderDraft() { try { return JSON.parse(localStorage.getItem(ORDER_DRAFT_KEY) || "[]"); } catch { return []; } }
function saveOrderDraft() { localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(getOrderLines())); }
function updateOrderTotal() { let total = 0, quantity = 0; getOrderLines().forEach(line => { total += line.price * line.quantity; quantity += line.quantity; }); document.getElementById("orderTotal").textContent = `${total} Ar (${quantity} unités)`; }
async function sendOrder() {
  const items = getOrderLines();
  if (!items.length || items.some(item => item.quantity <= 0 || item.piecesQuantity <= 0)) {
    return alert("Ajoutez au moins une ligne valide avec un nombre de pièces et une quantité supérieurs à zéro.");
  }
  const res = await fetch("/api/orders/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  const result = await res.json();
  if (!res.ok) return alert(result.message || "Erreur lors de l'enregistrement.");
  localStorage.removeItem(ORDER_DRAFT_KEY);
  document.getElementById("orderModal").style.display = "none";
  alert(result.message);
  window.location.reload();
}
